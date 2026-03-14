import { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJwt } from '../utils/jwt';
import { get, isEmpty } from 'radash';
import { HonoEnv } from '../env';
import { cleanJwtCookie } from '../routes/auth-middleware';
import AlbumService from '../services/album-service';
import R2Service from '../services/r2-service';
import { PhotoResponse, PhotosRequest, RenamePhotoRequest } from '../types';
import { Album } from '../types/album';
import { UserPermission } from '../types/user-permission';
import { buildR2Config, deleteObjects } from '../utils/helpers';
import { BaseController } from './base-controller';

export default class PhotoController extends BaseController {
  /**
   * Get all photos from an album
   */
  findAll = async (c: Context<HonoEnv>) => {
    const albumId = c.req.param('albumId');
    const albumService = new AlbumService(c.env.DB);
    const r2Config = buildR2Config(c.env);
    const r2Service = new R2Service(r2Config);
    const bucketName = c.env.R2_BUCKET_NAME;

    try {
      const album = await albumService.getById(albumId);

      if (!album) {
        return this.notFoundError(c, 'Album does not exist');
      }

      // Check authorization for private albums
      const accessError = await this.checkAlbumAccess(c, album);
      if (accessError) {
        return accessError;
      }

      const folderNameKey = decodeURIComponent(albumId) + '/';
      const photos = await r2Service.findAll({
        Prefix: folderNameKey,
        Bucket: bucketName,
        MaxKeys: 1000,
        StartAfter: folderNameKey,
      });

      // Synchronize album cover
      await this.syncAlbumCover(albumService, album, photos);

      return this.ok<PhotoResponse>(c, 'ok', { album, photos });
    } catch (err: any) {
      console.error('Failed to get photos: %s', err);
      return this.fail(c, 'Failed to get photos');
    }
  };

  /**
   * Check if user has access to the album
   * @param c Hono Context
   * @param album Album object
   * @returns Error Response if access is denied, otherwise void
   */
  private async checkAlbumAccess(c: Context<HonoEnv>, album: Album): Promise<Response | void> {
    if (!album.isPrivate) {
      return;
    }

    const token = getCookie(c, 'jwt');
    if (!token) {
      return cleanJwtCookie(c, 'Authentication failed.');
    }

    try {
      const decodedPayload = await verifyJwt<UserPermission>(token, c.env.JWT_SECRET);
      const isAdmin = get(decodedPayload, 'role') === 'admin';
      if (!isAdmin) {
        return cleanJwtCookie(c, 'Unauthorized action.', 403);
      }
    } catch (error) {
      console.error('JWT verification failed in PhotoController.checkAlbumAccess:', error);
      return cleanJwtCookie(c, 'Authentication failed.');
    }
  }

  /**
   * Update album cover if needed
   * @param albumService Album service
   * @param album Album object
   * @param photos Photo list
   */
  private async syncAlbumCover(albumService: AlbumService, album: Album, photos: any[]): Promise<void> {
    const hasPhotos = !isEmpty(photos);
    const hasCover = !isEmpty(album.albumCover);

    if (hasPhotos && !hasCover) {
      await albumService.update(album.id, {
        ...album,
        albumCover: photos[0]?.key || '',
        updatedBy: 'System',
      });
    } else if (!hasPhotos && hasCover) {
      await albumService.update(album.id, {
        ...album,
        albumCover: '',
        updatedBy: 'System',
      });
    }
  }

  create = async (c: Context<HonoEnv>) => {
    const albumId = c.req.param('albumId');
    const filename = c.req.query('filename');
    const mimeType = c.req.query('mimeType');

    if (!filename || !mimeType) {
      return this.fail(c, 'Filename and mimeType are required in query parameters');
    }

    const r2Config = buildR2Config(c.env);
    const r2Service = new R2Service(r2Config);
    const filePath = `${albumId}/${filename}`;

    try {
      const uploadUrl = await r2Service.getPresignedUploadUrl(
        c.env.R2_BUCKET_NAME,
        filePath,
        mimeType,
      );

      console.log(`##### Generated presigned URL for file: ${filePath}`);
      return this.ok(c, 'ok', { uploadUrl });
    } catch (err: any) {
      console.error('Failed to generate presigned URL: %s', err);
      return this.fail(c, 'Failed to generate upload URL');
    }
  };

  /**
   * Move photos to another album
   */
  update = async (c: Context<HonoEnv>) => {
    const { destinationAlbumId, albumId, photoKeys } = await c.req.json<PhotosRequest>();
    const r2Config = buildR2Config(c.env);
    const r2Service = new R2Service(r2Config);
    const bucketName = c.env.R2_BUCKET_NAME;

    const copyPromises = photoKeys.map(async (photoKey) => {
      const sourcePhotoKey = `${albumId}/${photoKey}`;
      try {
        const result = await r2Service.copy({
          Bucket: bucketName,
          CopySource: `/${bucketName}/${sourcePhotoKey}`,
          Key: `${destinationAlbumId}/${photoKey}`,
        });
        return result ? sourcePhotoKey : null;
      } catch (e) {
        console.error(`Failed to copy photo ${sourcePhotoKey}:`, e);
        return null;
      }
    });

    try {
      const results = await Promise.all(copyPromises);
      const successfulSourceKeys = results.filter((key): key is string => key !== null);

      if (successfulSourceKeys.length > 0) {
        const deleted = await deleteObjects(r2Config, bucketName, successfulSourceKeys);
        if (!deleted) {
          console.error('Failed to delete source photos after copy: %s', successfulSourceKeys.join(', '));
          return this.fail(c, 'Photos were copied but failed to remove originals');
        }
        console.log(`##### Photos moved: ${successfulSourceKeys.join(', ')}`);
      }

      if (successfulSourceKeys.length === 0 && photoKeys.length > 0) {
        return this.fail(c, 'Failed to move any photos');
      }

      return this.ok(c, 'Photo moved');
    } catch (err: any) {
      console.error(`Failed to move photos: ${err}`);
      return this.fail(c, 'Failed to move photos');
    }
  };

  rename = async (c: Context<HonoEnv>) => {
    const { albumId, newPhotoKey, currentPhotoKey } = await c.req.json<RenamePhotoRequest>();
    const r2Config = buildR2Config(c.env);
    const r2Service = new R2Service(r2Config);
    const bucketName = c.env.R2_BUCKET_NAME;

    // Currently, the only way to rename an object using the SDK is to copy the object with a different name and
    // then delete the original object.
    try {
      const result = await r2Service.copy({
        Bucket: bucketName,
        CopySource: `/${bucketName}/${albumId}/${currentPhotoKey}`,
        Key: `${albumId}/${newPhotoKey}`,
      });
      if (result) {
        const deleted = await deleteObjects(r2Config, bucketName, [`${albumId}/${currentPhotoKey}`]);
        if (!deleted) {
          console.error('Failed to delete original photo after rename: %s', `${albumId}/${currentPhotoKey}`);
          return this.fail(c, 'Photo was renamed but failed to remove original');
        }
        return this.ok(c, 'Photo renamed');
      }
      return this.fail(c, 'Failed to rename photo');
    } catch (err: any) {
      console.error('Failed to rename photo: %s', err);
      return this.fail(c, 'Failed to rename photo');
    }
  };

  delete = async (c: Context<HonoEnv>) => {
    const { albumId, photoKeys } = await c.req.json<PhotosRequest>();

    const photoKeysArray = photoKeys.map((photoKey) => `${albumId}/${photoKey}`);
    try {
      const r2Config = buildR2Config(c.env);
      const bucketName = c.env.R2_BUCKET_NAME;
      const result = await deleteObjects(r2Config, bucketName, photoKeysArray);
      if (result) {
        return this.ok(c, 'Photo deleted');
      }
      return this.fail(c, 'Failed to delete photos');
    } catch (err: any) {
      console.error('Failed to delete photos: %s', err);
      return this.fail(c, 'Failed to delete photos');
    }
  };

  findOne = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };
}
