import { beforeEach, describe, expect, it, vi } from 'vitest';
import { D1Service } from '../../src/services/d1-service';

interface TestEntity {
  id: string;
  name: string;
  active: boolean;
  count: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

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

describe('D1Service', () => {
  let service: D1Service<TestEntity>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new D1Service<TestEntity>(mockDb as unknown as D1Database, 'test_table');
  });

  /* ------------------------------------------------------------------ */
  /* getAll                                                              */
  /* ------------------------------------------------------------------ */
  describe('getAll', () => {
    it('should SELECT * when called without where clause', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [{ id: '1', name: 'a' }] });

      const result = await service.getAll();

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM test_table');
      expect(result).toEqual([{ id: '1', name: 'a' }]);
    });

    it('should return empty array when results is null', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: null });

      const result = await service.getAll();

      expect(result).toEqual([]);
    });

    it('should delegate to findAll when where has keys', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [{ id: '1', name: 'match' }] });

      const result = await service.getAll({ name: 'match' } as Partial<TestEntity>);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('WHERE');
      expect(sql).toContain('name = ?');
      expect(result).toEqual([{ id: '1', name: 'match' }]);
    });

    it('should SELECT * when where is an empty object', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.getAll({} as Partial<TestEntity>);

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM test_table');
    });
  });

  /* ------------------------------------------------------------------ */
  /* getById                                                             */
  /* ------------------------------------------------------------------ */
  describe('getById', () => {
    it('should bind id and return result', async () => {
      const entity = { id: 'abc', name: 'found' };
      mockDb._stmt.first.mockResolvedValueOnce(entity);

      const result = await service.getById('abc');

      expect(mockDb._stmt.bind).toHaveBeenCalledWith('abc');
      expect(result).toEqual(entity);
    });

    it('should return null when record not found', async () => {
      mockDb._stmt.first.mockResolvedValueOnce(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  /* ------------------------------------------------------------------ */
  /* findAll                                                             */
  /* ------------------------------------------------------------------ */
  describe('findAll', () => {
    it('should build WHERE clause for multiple conditions', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.findAll({ name: 'test', active: true } as Partial<TestEntity>);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('name = ?');
      expect(sql).toContain('AND');
      expect(sql).toContain('active = ?');
    });

    it('should skip undefined values in where clause', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.findAll({ name: 'test', active: undefined } as Partial<TestEntity>);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('name = ?');
      expect(sql).not.toContain('active');
    });

    it('should use 1=1 when all where values are undefined', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: [] });

      await service.findAll({ name: undefined } as unknown as Partial<TestEntity>);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('1=1');
    });

    it('should return empty array when results is null', async () => {
      mockDb._stmt.all.mockResolvedValueOnce({ results: null });

      const result = await service.findAll({ name: 'x' } as Partial<TestEntity>);

      expect(result).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /* findOne                                                             */
  /* ------------------------------------------------------------------ */
  describe('findOne', () => {
    it('should return single matching record', async () => {
      const entity = { id: '1', name: 'unique' };
      mockDb._stmt.first.mockResolvedValueOnce(entity);

      const result = await service.findOne({ name: 'unique' } as Partial<TestEntity>);

      expect(result).toEqual(entity);
    });

    it('should return null when no match', async () => {
      mockDb._stmt.first.mockResolvedValueOnce(null);

      const result = await service.findOne({ name: 'nope' } as Partial<TestEntity>);

      expect(result).toBeNull();
    });
  });

  /* ------------------------------------------------------------------ */
  /* create                                                              */
  /* ------------------------------------------------------------------ */
  describe('create', () => {
    it('should insert all non-undefined fields', async () => {
      await service.create({ id: '1', name: 'test', active: true, count: 5 } as TestEntity);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('INSERT INTO test_table');
      expect(sql).toContain('id, name, active, count');
      expect(mockDb._stmt.bind).toHaveBeenCalledWith('1', 'test', true, 5);
    });

    it('should skip undefined fields', async () => {
      await service.create({ id: '1', name: 'test', metadata: undefined } as unknown as TestEntity);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).not.toContain('metadata');
    });

    it('should throw when all fields are undefined', async () => {
      await expect(service.create({ id: undefined } as unknown as TestEntity)).rejects.toThrow(
        'No valid fields to insert',
      );
    });

    it('should convert Date values to ISO strings', async () => {
      const date = new Date('2025-06-15T10:00:00Z');
      await service.create({ id: '1', name: 'test', createdAt: date } as unknown as TestEntity);

      expect(mockDb._stmt.bind).toHaveBeenCalledWith('1', 'test', date.toISOString());
    });

    it('should JSON.stringify object values', async () => {
      const meta = { foo: 'bar', nested: [1, 2] };
      await service.create({ id: '1', name: 'test', metadata: meta } as unknown as TestEntity);

      expect(mockDb._stmt.bind).toHaveBeenCalledWith('1', 'test', JSON.stringify(meta));
    });

    it('should convert null field to null', async () => {
      await service.create({ id: '1', name: null } as unknown as TestEntity);

      expect(mockDb._stmt.bind).toHaveBeenCalledWith('1', null);
    });

    it('should throw for unstringifiable object (circular reference)', async () => {
      const circular: Record<string, unknown> = { id: '1' };
      circular['self'] = circular;

      await expect(service.create(circular as unknown as TestEntity)).rejects.toThrow(
        'Failed to stringify JSON field',
      );
    });

    it('should throw for unsupported value types like functions', async () => {
      const item = { id: '1', name: (() => {}) as unknown as string };

      await expect(service.create(item as unknown as TestEntity)).rejects.toThrow(
        'Unsupported value for D1',
      );
    });
  });

  /* ------------------------------------------------------------------ */
  /* update                                                              */
  /* ------------------------------------------------------------------ */
  describe('update', () => {
    it('should build SET clause and append id to bind values', async () => {
      await service.update('99', { name: 'updated', count: 10 } as Partial<TestEntity>);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE test_table SET');
      expect(sql).toContain('name = ?');
      expect(sql).toContain('count = ?');
      expect(sql).toContain('WHERE id = ?');
      // bind values: name, count, then id
      expect(mockDb._stmt.bind).toHaveBeenCalledWith('updated', 10, '99');
    });

    it('should skip undefined fields', async () => {
      await service.update('1', { name: 'new', active: undefined } as Partial<TestEntity>);

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).not.toContain('active');
    });

    it('should throw when no fields to update', async () => {
      await expect(
        service.update('1', { name: undefined } as unknown as Partial<TestEntity>),
      ).rejects.toThrow('No fields to update');
    });

    it('should JSON.stringify object values in update', async () => {
      const meta = { key: 'value' };
      await service.update('1', { metadata: meta } as unknown as Partial<TestEntity>);

      expect(mockDb._stmt.bind).toHaveBeenCalledWith(JSON.stringify(meta), '1');
    });

    it('should convert Date values in update', async () => {
      const date = new Date('2025-01-01T00:00:00Z');
      await service.update('1', { createdAt: date } as unknown as Partial<TestEntity>);

      expect(mockDb._stmt.bind).toHaveBeenCalledWith(date.toISOString(), '1');
    });
  });

  /* ------------------------------------------------------------------ */
  /* delete                                                              */
  /* ------------------------------------------------------------------ */
  describe('delete', () => {
    it('should prepare DELETE with bound id', async () => {
      await service.delete('42');

      const sql = mockDb.prepare.mock.calls[0][0] as string;
      expect(sql).toContain('DELETE FROM test_table WHERE id = ?');
      expect(mockDb._stmt.bind).toHaveBeenCalledWith('42');
      expect(mockDb._stmt.run).toHaveBeenCalled();
    });
  });
});
