import { Album, AlbumsByYear } from '../types/album';
import { D1Service } from './d1-service';

export default class AggregationService extends D1Service<Album> {
  constructor(db: D1Database) {
    super(db, 'albums'); // Base table is albums
  }

  async getAlbumsWithLocation(includePrivate: boolean): Promise<Album[]> {
    let sql = `
      SELECT *
      FROM albums
      WHERE place IS NOT NULL AND place != ''
    `;

    if (!includePrivate) {
      sql += ' AND isPrivate = 0';
    }

    const { results } = await this.db.prepare(sql).all();
    return (results || []).map((item) => this.mapAlbum(item));
  }

  async getFeaturedAlbums(): Promise<Album[]> {
    const sql = `
      SELECT *
      FROM albums
      WHERE isFeatured = 1
    `;
    const { results } = await this.db.prepare(sql).all();
    return (results || []).map((item) => this.mapAlbum(item));
  }

  async getCountAlbumsByYear(includePrivate: boolean): Promise<AlbumsByYear> {
    let sql = `
      SELECT year, COUNT(*) as count
      FROM albums
    `;

    if (!includePrivate) {
      sql += ' WHERE isPrivate = 0';
    }

    sql += ' GROUP BY year ORDER BY year DESC';

    const { results } = await this.db.prepare(sql).all();
    return (results as unknown as AlbumsByYear) || [];
  }

  private mapAlbum(item: any): Album {
    // Parse tags
    if (item.tags && typeof item.tags === 'string') {
      try {
        item.tags = JSON.parse(item.tags);
      } catch (e: any) {
        console.error(`Failed to parse tags for album ${item.id || item.title}: ${e.message}`, e);
        item.tags = [];
      }
    } else if (!item.tags) {
      item.tags = [];
    }

    // Parse place
    if (item.place && typeof item.place === 'string') {
      try {
        item.place = JSON.parse(item.place);
      } catch (e: any) {
        console.error(`Failed to parse place for album ${item.id || item.title}: ${e.message}`, e);
        item.place = undefined;
      }
    }

    // Convert booleans
    if (item.isPrivate !== undefined) {
      item.isPrivate = !!item.isPrivate;
    }
    if (item.isFeatured !== undefined) {
      item.isFeatured = !!item.isFeatured;
    }
    return item as Album;
  }
}
