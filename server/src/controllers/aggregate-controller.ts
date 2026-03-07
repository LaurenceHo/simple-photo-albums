import { Context } from 'hono';
import { HonoEnv } from '../env';
import AggregationService from '../services/aggregation-service';
import { Album, AlbumsByYear } from '../types/album';
import { UserPermission } from '../types/user-permission';
import { BaseController } from './base-controller';

export default class AggregateController extends BaseController {
  findAll = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };

  create = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };

  update = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };

  delete = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };

  findOne = async (c: Context<HonoEnv>) => {
    const aggregateType = c.req.param('type') as
      | 'albums-with-location'
      | 'count-albums-by-year'
      | 'featured-albums';

    const aggregationService = new AggregationService(c.env.DB);

    if (aggregateType === 'albums-with-location') {
      const user = c.get('user') as UserPermission;
      const isAdmin = user?.role === 'admin';
      try {
        const albumData = await aggregationService.getAlbumsWithLocation(isAdmin);
        return this.ok<Album[]>(c, 'ok', albumData);
      } catch (err: any) {
        console.error(`Failed to query aggregate data for photo album with location: ${err}`);
        return this.fail(c, 'Failed to query aggregate data for photo album with location');
      }
    } else if (aggregateType === 'count-albums-by-year') {
      const user = c.get('user') as UserPermission;
      const isAdmin = user?.role === 'admin';

      try {
        const countData = await aggregationService.getCountAlbumsByYear(isAdmin);
        return this.ok<AlbumsByYear>(c, 'ok', countData);
      } catch (err: any) {
        console.error(`Failed to query aggregate data for count albums by year: ${err}`);
        return this.fail(c, 'Failed to query aggregate data for count albums by year');
      }
    } else if (aggregateType === 'featured-albums') {
      try {
        const featuredAlbums = await aggregationService.getFeaturedAlbums();
        return this.ok<Album[]>(c, 'ok', featuredAlbums);
      } catch (err: any) {
        console.error(`Failed to query aggregate data for featured albums: ${err}`);
        return this.fail(c, 'Failed to query aggregate data for featured albums');
      }
    }
    return this.clientError(c, `Invalid aggregate type: ${aggregateType}`);
  };
}
