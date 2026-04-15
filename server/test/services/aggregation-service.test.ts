import { beforeEach, describe, expect, it, vi } from 'vitest';
import AggregationService from '../../src/services/aggregation-service';

function createMockDb() {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: [] }),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({}),
  };
  return {
    prepare: vi.fn().mockReturnValue(stmt),
    batch: vi.fn().mockResolvedValue([]),
    _stmt: stmt,
  };
}

describe('AggregationService', () => {
  let service: AggregationService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new AggregationService(mockDb as unknown as D1Database);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  /* ------------------------------------------------------------------ */
  /* getAlbumsWithLocation                                               */
  /* ------------------------------------------------------------------ */
  describe('getAlbumsWithLocation', () => {
    it('should exclude private albums when includePrivate is false', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.getAlbumsWithLocation(false);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain("place IS NOT NULL AND place != ''");
      expect(sql).toContain('AND isPrivate = 0');
    });

    it('should include private albums when includePrivate is true', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.getAlbumsWithLocation(true);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain("place IS NOT NULL AND place != ''");
      expect(sql).not.toContain('isPrivate');
    });

    it('should map results through mapAlbum', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [
          {
            id: '1',
            tags: '["travel"]',
            place:
              '{"displayName":"Tokyo","formattedAddress":"Tokyo, Japan","location":{"latitude":35.6,"longitude":139.7}}',
            isPrivate: 0,
          },
        ],
      });

      const result = await service.getAlbumsWithLocation(true);

      expect(result[0].tags).toEqual(['travel']);
      expect(result[0].place?.displayName).toBe('Tokyo');
      expect(result[0].isPrivate).toBe(false);
    });

    it('should return empty array when results is null', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: null });

      const result = await service.getAlbumsWithLocation(true);

      expect(result).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /* getFeaturedAlbums                                                   */
  /* ------------------------------------------------------------------ */
  describe('getFeaturedAlbums', () => {
    it('should query for isFeatured = 1', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.getFeaturedAlbums();

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('WHERE isFeatured = 1');
    });

    it('should map results through mapAlbum', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: null, isFeatured: 1 }],
      });

      const result = await service.getFeaturedAlbums();

      expect(result[0].tags).toEqual([]);
      expect(result[0].isFeatured).toBe(true);
    });

    it('should return empty array when no featured albums', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      const result = await service.getFeaturedAlbums();

      expect(result).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /* getCountAlbumsByYear                                                */
  /* ------------------------------------------------------------------ */
  describe('getCountAlbumsByYear', () => {
    it('should exclude private albums when includePrivate is false', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.getCountAlbumsByYear(false);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('WHERE isPrivate = 0');
      expect(sql).toContain('GROUP BY year ORDER BY year DESC');
    });

    it('should include all albums when includePrivate is true', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.getCountAlbumsByYear(true);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).not.toContain('WHERE');
      expect(sql).toContain('GROUP BY year ORDER BY year DESC');
    });

    it('should return year counts', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [
          { year: '2024', count: 5 },
          { year: '2023', count: 3 },
        ],
      });

      const result = await service.getCountAlbumsByYear(true);

      expect(result).toEqual([
        { year: '2024', count: 5 },
        { year: '2023', count: 3 },
      ]);
    });

    it('should return empty array when results is null', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: null });

      const result = await service.getCountAlbumsByYear(true);

      expect(result).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /* mapAlbum edge cases                                                 */
  /* ------------------------------------------------------------------ */
  describe('mapAlbum (via getAlbumsWithLocation)', () => {
    it('should parse valid tags JSON string', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [
          {
            id: '1',
            tags: '["a","b"]',
            place:
              '{"displayName":"X","formattedAddress":"X","location":{"latitude":0,"longitude":0}}',
          },
        ],
      });

      const [album] = await service.getAlbumsWithLocation(true);
      expect(album.tags).toEqual(['a', 'b']);
    });

    it('should fallback to empty array for invalid tags JSON and log error', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [
          {
            id: 'bad',
            title: 'Bad Tags',
            tags: '{{invalid',
            place:
              '{"displayName":"X","formattedAddress":"X","location":{"latitude":0,"longitude":0}}',
          },
        ],
      });

      const [album] = await service.getAlbumsWithLocation(true);

      expect(album.tags).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse tags'),
        expect.anything(),
      );
    });

    it('should set tags to empty array when tags is null', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [
          {
            id: '1',
            tags: null,
            place:
              '{"displayName":"X","formattedAddress":"X","location":{"latitude":0,"longitude":0}}',
          },
        ],
      });

      const [album] = await service.getAlbumsWithLocation(true);
      expect(album.tags).toEqual([]);
    });

    it('should set place to undefined for invalid place JSON and log error', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: 'bad', title: 'Bad Place', tags: '[]', place: 'not-json' }],
      });

      const [album] = await service.getAlbumsWithLocation(true);

      expect(album.place).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse place'),
        expect.anything(),
      );
    });

    it('should convert SQLite boolean integers', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [
          {
            id: '1',
            tags: '[]',
            place:
              '{"displayName":"X","formattedAddress":"X","location":{"latitude":0,"longitude":0}}',
            isPrivate: 1,
            isFeatured: 0,
          },
        ],
      });

      const [album] = await service.getAlbumsWithLocation(true);

      expect(album.isPrivate).toBe(true);
      expect(album.isFeatured).toBe(false);
    });

    it('should not touch boolean fields when undefined', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [
          {
            id: '1',
            tags: '[]',
            place:
              '{"displayName":"X","formattedAddress":"X","location":{"latitude":0,"longitude":0}}',
          },
        ],
      });

      const [album] = await service.getAlbumsWithLocation(true);

      expect(album.isPrivate).toBeUndefined();
      expect(album.isFeatured).toBeUndefined();
    });
  });
});
