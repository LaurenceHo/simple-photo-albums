import { Context } from 'hono';
import { HonoEnv } from '../env.js';
import AlbumTagService from '../services/album-tag-service.js';
import { AlbumTag } from '../types/album.js';
import { UserPermission } from '../types/user-permission.js';
import { BaseController } from './base-controller.js';

export default class AlbumTagController extends BaseController {
  findAll = async (c: Context<HonoEnv>) => {
    const albumTagService = new AlbumTagService(c.env.DB);
    try {
      const albumTags = await albumTagService.getAll();

      return this.ok<AlbumTag[]>(c, 'ok', albumTags);
    } catch (err: any) {
      console.error(`Failed to query album tags: ${err}`);
      return this.fail(c, 'Failed to query album tags');
    }
  };

  create = async (c: Context<HonoEnv>) => {
    const tags = await c.req.json<AlbumTag[]>();
    const user = c.get('user') as UserPermission;
    const tagsToCreate: AlbumTag[] = tags.map((tag) => {
      return {
        ...tag,
        createdBy: user?.email ?? 'unknown',
      };
    });
    const albumTagService = new AlbumTagService(c.env.DB);

    try {
      await albumTagService.create(tagsToCreate);

      return this.ok(c, 'Album tag created');
    } catch (err) {
      console.error(`Failed to create album tag: ${err}`);
      return this.fail(c, 'Failed to create album tag');
    }
  };

  delete = async (c: Context<HonoEnv>) => {
    const tag = c.req.param('tagId');
    const albumTagService = new AlbumTagService(c.env.DB);
    try {
      console.log('##### Delete tag: %s', tag);
      await albumTagService.delete(tag);

      return this.ok(c, 'Album tag deleted');
    } catch (err) {
      console.error(`Failed to delete album tag: ${err}`);
      return this.fail(c, 'Failed to delete album tag');
    }
  };

  findOne = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };

  update = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };
}
