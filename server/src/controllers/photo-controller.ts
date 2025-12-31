import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { get, isEmpty } from 'radash';
import { HonoEnv } from '../env.js';
import { cleanJwtCookie } from '../routes/auth-middleware.js';
import AlbumService from '../services/album-service.js';
import S3Service from '../services/s3-service.js';
import { PhotoResponse, PhotosRequest, RenamePhotoRequest } from '../types';
import { UserPermission } from '../types/user-permission.js';
import { deleteObjects } from '../utils/helpers.js';
import { BaseController } from './base-controller.js';

export default class PhotoController extends BaseController {
  /**
   * Get all photos from an album
   */
  findAll = async (c: Context<HonoEnv>) => {
    const albumId = c.req.param('albumId');
    const albumService = new AlbumService(c.env.DB);
    const s3Service = new S3Service();
    const bucketName = c.env.AWS_S3_BUCKET_NAME;

    try {
      const album = await albumService.getById(albumId);

      // Only fetch photos when album exists
      if (!isEmpty(album) && album !== null) {
        // If album is private, check if user has the admin permission
        if (album.isPrivate) {
          const token = getCookie(c, 'jwt');
          if (token) {
            try {
              const decodedPayload = jwt.verify(token, c.env.JWT_SECRET) as UserPermission;
              const isAdmin = get(decodedPayload, 'role') === 'admin';
              if (!isAdmin) {
                return cleanJwtCookie(c, 'Unauthorized action.', 403);
              }
            } catch (error) {
              return cleanJwtCookie(c, 'Authentication failed.');
            }
          } else {
            return cleanJwtCookie(c, 'Authentication failed.');
          }
        }
        const folderNameKey = decodeURIComponent(albumId) + '/';
        const photos = await s3Service.findAll({
          Prefix: folderNameKey,
          Bucket: bucketName,
          MaxKeys: 1000,
          StartAfter: folderNameKey,
        });

        // If photo list is not empty and doesn't have album cover, set album cover
        if (!isEmpty(photos) && isEmpty(album.albumCover)) {
          await albumService.update(album.id, {
            ...album,
            albumCover: photos[0]?.key || '',
            updatedBy: 'System',
          });

          // Remove album cover photo when photo list is empty
        } else if (isEmpty(photos) && !isEmpty(album.albumCover)) {
          await albumService.update(album.id, {
            ...album,
            albumCover: '',
            updatedBy: 'System',
          });
        }
        return this.ok<PhotoResponse>(c, 'ok', { album, photos });
      }
      return this.notFoundError(c, 'Album does not exist');
    } catch (err: any) {
      console.error('Failed to get photos: %s', err);
      return this.fail(c, 'Failed to get photos');
    }
  };

  create = async (c: Context<HonoEnv>) => {
    const albumId = c.req.param('albumId');
    const filename = c.req.query('filename');
    const mimeType = c.req.query('mimeType');
    const bucketName = c.env.AWS_S3_BUCKET_NAME;
    const s3Client = new S3Client({
      region: c.env.AWS_REGION_NAME || 'us-east-1',
      credentials: {
        accessKeyId: c.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    if (!filename || !mimeType) {
      return this.fail(c, 'Filename and mimeType are required in query parameters');
    }

    const filePath = `${albumId}/${filename}`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filePath,
        ContentType: mimeType,
      });

      // Generate presigned URL (valid for 60 seconds)
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

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
    const s3Service = new S3Service();
    const bucketName = c.env.AWS_S3_BUCKET_NAME;

    const copyPromises = photoKeys.map(async (photoKey) => {
      const sourcePhotoKey = `${albumId}/${photoKey}`;
      try {
        const result = await s3Service.copy({
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
        await deleteObjects(successfulSourceKeys);
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
    const s3Service = new S3Service();
    const bucketName = c.env.AWS_S3_BUCKET_NAME;

    // Currently, the only way to rename an object using the SDK is to copy the object with a different name and
    // then delete the original object.
    try {
      const result = await s3Service.copy({
        Bucket: bucketName,
        CopySource: `/${bucketName}/${albumId}/${currentPhotoKey}`,
        Key: `${albumId}/${newPhotoKey}`,
      });
      if (result) {
        await deleteObjects([`${albumId}/${currentPhotoKey}`]);
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
      const result = await deleteObjects(photoKeysArray);
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
