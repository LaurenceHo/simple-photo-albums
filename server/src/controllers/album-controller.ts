import { Context } from 'hono';
import { HonoEnv } from '../env.js';
import AlbumService from '../services/album-service.js';
import { Album } from '../types/album';
import { UserPermission } from '../types/user-permission.js';
import {
  emptyS3Folder,
  uploadObject,
  verifyIfIsAdmin,
} from '../utils/helpers.js';
import { BaseController } from './base-controller.js';

export default class AlbumController extends BaseController {
  findAll = async (c: Context<HonoEnv>) => {
    const year = c.req.param('year');
    const albumService = new AlbumService(c.env.DB);

    try {
      const isAdmin = verifyIfIsAdmin(c);

      const query: any = { year };
      if (!isAdmin) {
        query.isPrivate = 0;
      }

      const albumList = await albumService.getAll(query);

      return this.ok<Album[]>(c, 'ok', albumList);
    } catch (err: any) {
      console.error(`Failed to query photo album: ${err.stack}`);
      return this.fail(c, 'Failed to query photo album');
    }
  };

  create = async (c: Context<HonoEnv>) => {
    const album = await c.req.json<Album>();
    const user = c.get('user') as UserPermission;
    album.createdBy = user?.email ?? 'unknown';
    album.updatedBy = user?.email ?? 'unknown';
    album.createdAt = new Date().toISOString();
    album.updatedAt = new Date().toISOString();
    const albumService = new AlbumService(c.env.DB);

    try {
      // Check if album already exists
      const existing = await albumService.getById(album.id);
      if (existing) {
        return this.clientError(c, 'Album already exists');
      }

      await albumService.create(album);
      // Create folder in S3
      await uploadObject(album.id + '/', null);
      return this.ok(c, 'Album created');
    } catch (err: any) {
      console.error(`Failed to insert photo album: ${err}`);
      return this.fail(c, 'Failed to create photo album');
    }
  };

  update = async (c: Context<HonoEnv>) => {
    try {
      const album = await c.req.json<Album>();
      const user = c.get('user') as UserPermission;
      album.updatedBy = user?.email ?? 'unknown';
      album.updatedAt = new Date().toISOString();

      const albumService = new AlbumService(c.env.DB);

      await albumService.update(album.id, album);

      return this.ok(c, 'Album updated');
    } catch (err: any) {
      console.error(`Failed to update photo album: ${err}`);
      return this.fail(c, 'Failed to update photo album');
    }
  };

  delete = async (c: Context<HonoEnv>) => {
    try {
      const requestBody = await c.req.json<{ id: string; year: string }>();
      console.log('##### Delete album: %s', requestBody.id);
      const albumService = new AlbumService(c.env.DB);

      // Empty S3 folder
      const result = await emptyS3Folder(requestBody.id);

      if (result) {
        // Delete album from database
        await albumService.delete(requestBody.id);
        return this.ok(c, 'Album deleted');
      } else {
        return this.fail(c, 'Failed to delete photo album');
      }
    } catch (err: any) {
      console.error(`Failed to delete photo album: ${err}`);
      return this.fail(c, 'Failed to delete photo album');
    }
  };

  findOne = async (c: Context<HonoEnv>) => {
    const albumId = c.req.param('id');
    const albumService = new AlbumService(c.env.DB);

    try {
      const album = await albumService.getById(albumId);
      if (!album) {
        return this.clientError(c, 'Album not found');
      }
      return this.ok<Album>(c, 'ok', album);
    } catch (err: any) {
      console.error(`Failed to query photo album: ${err}`);
      return this.fail(c, 'Failed to query photo album');
    }
  };
}
