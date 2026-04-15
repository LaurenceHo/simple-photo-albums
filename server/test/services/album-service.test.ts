import { beforeEach, describe, expect, it, vi } from 'vitest';
import AlbumService from '../../src/services/album-service';

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

describe('AlbumService', () => {
  let service: AlbumService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new AlbumService(mockDb as unknown as D1Database);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  /* ------------------------------------------------------------------ */
  /* getAll                                                              */
  /* ------------------------------------------------------------------ */
  describe('getAll', () => {
    it('should run aggregation query without outer WHERE when no filter', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.getAll();

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('json_group_array');
      // The subquery has WHERE but the outer query should not have a filter
      const outerQuery = sql.split('FROM albums a')[1] || '';
      expect(outerQuery.trim()).not.toContain('WHERE');
    });

    it('should add WHERE conditions when filter provided', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.getAll({ year: '2024' });

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('WHERE');
      expect(sql).toContain('a.year = ?');
    });

    it('should skip undefined values in filter', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.getAll({ year: '2024', albumName: undefined });

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('a.year = ?');
      expect(sql).not.toContain('albumName');
    });

    it('should map each result through mapAlbum', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [
          {
            id: '1',
            tags: '["tag1"]',
            place: '{"displayName":"Paris"}',
            isPrivate: 1,
            isFeatured: 0,
          },
          { id: '2', tags: null, place: null, isPrivate: 0 },
        ],
      });

      const result = await service.getAll();

      expect(result[0].tags).toEqual(['tag1']);
      expect(result[0].isPrivate).toBe(true);
      expect(result[0].isFeatured).toBe(false);
      expect(result[1].tags).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /* getById                                                             */
  /* ------------------------------------------------------------------ */
  describe('getById', () => {
    it('should return mapped album when found', async () => {
      mockDb._stmt.first.mockResolvedValueOnce({
        id: 'test',
        tags: '["a","b"]',
        place:
          '{"displayName":"Tokyo","formattedAddress":"Tokyo, Japan","location":{"latitude":35.6,"longitude":139.7}}',
        isPrivate: 0,
        isFeatured: 1,
      });

      const result = await service.getById('test');

      expect(result).not.toBeNull();
      expect(result!.tags).toEqual(['a', 'b']);
      expect(result!.isFeatured).toBe(true);
      expect(result!.isPrivate).toBe(false);
    });

    it('should return null when album not found', async () => {
      mockDb._stmt.first.mockResolvedValueOnce(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  /* ------------------------------------------------------------------ */
  /* create                                                              */
  /* ------------------------------------------------------------------ */
  describe('create', () => {
    it('should insert album and link tags when tags provided', async () => {
      const album = {
        id: 'new-album',
        year: '2024',
        albumName: 'Test',
        isPrivate: false,
        tags: ['nature', 'travel'],
        createdAt: '2024-01-01',
        createdBy: 'user1',
        updatedAt: '2024-01-01',
        updatedBy: 'user1',
      };

      await service.create(album as any);

      // Album insert (super.create) + tag ensure + tag map link = 3 prepare calls
      expect(mockDb.prepare).toHaveBeenCalled();
      // batch called twice: once for tag ensure, once for tag linking
      expect(mockDb.batch).toHaveBeenCalledTimes(2);
    });

    it('should skip tag insertion when tags array is empty', async () => {
      const album = {
        id: 'new-album',
        year: '2024',
        albumName: 'Test',
        isPrivate: false,
        tags: [],
        createdAt: '2024-01-01',
        createdBy: 'user1',
        updatedAt: '2024-01-01',
        updatedBy: 'user1',
      };

      await service.create(album as any);

      // batch should not be called for empty tags
      expect(mockDb.batch).not.toHaveBeenCalled();
    });

    it('should skip tag insertion when tags is undefined', async () => {
      const album = {
        id: 'no-tags',
        year: '2024',
        albumName: 'No Tags',
        isPrivate: false,
        createdAt: '2024-01-01',
        createdBy: 'user1',
        updatedAt: '2024-01-01',
        updatedBy: 'user1',
      };

      await service.create(album as any);

      expect(mockDb.batch).not.toHaveBeenCalled();
    });

    it('should use createdBy fallback to system when not provided', async () => {
      const album = {
        id: 'sys-album',
        year: '2024',
        albumName: 'System',
        isPrivate: false,
        tags: ['tag1'],
        createdAt: '2024-01-01',
        createdBy: '',
        updatedAt: '2024-01-01',
        updatedBy: '',
      };

      await service.create(album as any);

      // The tag INSERT uses createdBy || 'system'
      // bind is called for tag statement
      const bindCalls = mockDb._stmt.bind.mock.calls;
      const tagBindCall = bindCalls.find((call: unknown[]) => call[0] === 'tag1');
      // Third arg should be 'system' (fallback) since createdBy is empty string (falsy)
      expect(tagBindCall?.[2]).toBe('system');
    });
  });

  /* ------------------------------------------------------------------ */
  /* update                                                              */
  /* ------------------------------------------------------------------ */
  describe('update', () => {
    it('should replace tags when tags array provided', async () => {
      const updates = {
        albumName: 'Updated',
        tags: ['new-tag'],
        updatedBy: 'editor',
      };

      await service.update('album-1', updates as any);

      // Should delete old tag map entries
      const prepareCalls = mockDb.prepare.mock.calls.map((c: unknown[]) => c[0]);
      expect(prepareCalls.some((sql: string) => sql.includes('DELETE FROM album_tags_map'))).toBe(
        true,
      );
      // Should batch insert new tags
      expect(mockDb.batch).toHaveBeenCalled();
    });

    it('should clear all tags when tags is empty array', async () => {
      const updates = { albumName: 'Updated', tags: [] };

      await service.update('album-1', updates as any);

      // Should delete existing map entries
      const prepareCalls = mockDb.prepare.mock.calls.map((c: unknown[]) => c[0]);
      expect(prepareCalls.some((sql: string) => sql.includes('DELETE FROM album_tags_map'))).toBe(
        true,
      );
      // Should NOT batch insert (empty array)
      expect(mockDb.batch).not.toHaveBeenCalled();
    });

    it('should skip tag management when tags is undefined', async () => {
      const updates = { albumName: 'No Tag Change' };

      await service.update('album-1', updates as any);

      // Should NOT touch album_tags_map
      const prepareCalls = mockDb.prepare.mock.calls.map((c: unknown[]) => c[0]);
      expect(prepareCalls.some((sql: string) => sql.includes('DELETE FROM album_tags_map'))).toBe(
        false,
      );
      expect(mockDb.batch).not.toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------------ */
  /* mapAlbum edge cases                                                 */
  /* ------------------------------------------------------------------ */
  describe('mapAlbum (via getAll)', () => {
    it('should parse valid JSON tags string', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: '["a","b","c"]' }],
      });

      const [album] = await service.getAll();
      expect(album.tags).toEqual(['a', 'b', 'c']);
    });

    it('should fallback to empty array for invalid tags JSON', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: 'not-json' }],
      });

      const [album] = await service.getAll();
      expect(album.tags).toEqual([]);
    });

    it('should set tags to empty array when tags is null', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: null }],
      });

      const [album] = await service.getAll();
      expect(album.tags).toEqual([]);
    });

    it('should leave tags as-is when already an array (non-string)', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: ['already', 'parsed'] }],
      });

      const [album] = await service.getAll();
      expect(album.tags).toEqual(['already', 'parsed']);
    });

    it('should parse valid JSON place string', async () => {
      const place = {
        displayName: 'Paris',
        formattedAddress: 'Paris, France',
        location: { latitude: 48.8, longitude: 2.3 },
      };
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: '[]', place: JSON.stringify(place) }],
      });

      const [album] = await service.getAll();
      expect(album.place).toEqual(place);
    });

    it('should set place to undefined for invalid place JSON', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: '[]', place: '{broken' }],
      });

      const [album] = await service.getAll();
      expect(album.place).toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse place JSON'),
        expect.anything(),
      );
    });

    it('should leave place as-is when not a string (already parsed or null)', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: '[]', place: null }],
      });

      const [album] = await service.getAll();
      expect(album.place).toBeNull();
    });

    it('should convert SQLite integer 1 to boolean true for isPrivate', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: '[]', isPrivate: 1 }],
      });

      const [album] = await service.getAll();
      expect(album.isPrivate).toBe(true);
    });

    it('should convert SQLite integer 0 to boolean false for isFeatured', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: '[]', isFeatured: 0 }],
      });

      const [album] = await service.getAll();
      expect(album.isFeatured).toBe(false);
    });

    it('should not touch isPrivate/isFeatured when undefined', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ id: '1', tags: '[]' }],
      });

      const [album] = await service.getAll();
      expect(album.isPrivate).toBeUndefined();
      expect(album.isFeatured).toBeUndefined();
    });
  });
});
