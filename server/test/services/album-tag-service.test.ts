import { beforeEach, describe, expect, it, vi } from 'vitest';
import AlbumTagService from '../../src/services/album-tag-service';

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

describe('AlbumTagService', () => {
  let service: AlbumTagService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new AlbumTagService(mockDb as unknown as D1Database);
  });

  /* ------------------------------------------------------------------ */
  /* getAll                                                              */
  /* ------------------------------------------------------------------ */
  describe('getAll', () => {
    it('should query with ORDER BY tag ASC', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({
        results: [{ tag: 'alpha' }, { tag: 'beta' }],
      });

      const result = await service.getAll();

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY tag ASC');
      expect(result).toEqual([{ tag: 'alpha' }, { tag: 'beta' }]);
    });

    it('should return empty array when no tags exist', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      const result = await service.getAll();

      expect(result).toEqual([]);
    });

    it('should return empty array when results is null', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: null });

      const result = await service.getAll();

      expect(result).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /* create                                                              */
  /* ------------------------------------------------------------------ */
  describe('create', () => {
    it('should batch insert an array of tags', async () => {
      const tags = [
        { tag: 'nature', createdBy: 'admin' },
        { tag: 'travel', createdBy: 'admin' },
      ];

      await service.create(tags);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('INSERT OR IGNORE INTO album_tags');
      expect(mockDb._stmt.bind).toHaveBeenCalledTimes(2);
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it('should wrap single tag object into array', async () => {
      await service.create({ tag: 'solo', createdBy: 'user1' });

      expect(mockDb._stmt.bind).toHaveBeenCalledTimes(1);
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it('should return early without batching for empty array', async () => {
      await service.create([]);

      expect(mockDb.prepare).not.toHaveBeenCalled();
      expect(mockDb.batch).not.toHaveBeenCalled();
    });

    it('should use "system" as fallback createdBy when not provided', async () => {
      await service.create({ tag: 'test', createdBy: '' });

      const bindCalls = mockDb._stmt.bind.mock.calls;
      // bind(tag, timestamp, createdBy || 'system')
      expect(bindCalls[0][0]).toBe('test');
      expect(bindCalls[0][2]).toBe('system');
    });
  });

  /* ------------------------------------------------------------------ */
  /* delete                                                              */
  /* ------------------------------------------------------------------ */
  describe('delete', () => {
    it('should delete from map table first, then tags table', async () => {
      await service.delete('old-tag');

      const prepareCalls = mockDb.prepare.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(prepareCalls[0]).toContain('DELETE FROM album_tags_map WHERE tag = ?');
      expect(prepareCalls[1]).toContain('DELETE FROM album_tags WHERE tag = ?');
      expect(mockDb._stmt.bind).toHaveBeenCalledWith('old-tag');
      expect(mockDb._stmt.run).toHaveBeenCalledTimes(2);
    });
  });
});
