import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { BaseController } from '../../src/controllers/base-controller';

// Concrete test subclass
class TestController extends BaseController {
  findAll = async () => {
    throw new Error('not impl');
  };
  findOne = async () => {
    throw new Error('not impl');
  };
  create = async () => {
    throw new Error('not impl');
  };
  update = async () => {
    throw new Error('not impl');
  };
  delete = async () => {
    throw new Error('not impl');
  };
}

const controller = new TestController();

function createApp() {
  const app = new Hono();

  app.get('/ok-no-data', (c) => controller.ok(c, 'done'));
  app.get('/ok-with-data', (c) =>
    controller.ok(c, 'ok', {
      id: '1',
      name: 'Test',
      createdAt: '2024-01-01',
      createdBy: 'admin',
      updatedAt: '2024-01-02',
      updatedBy: 'admin',
    }),
  );
  app.get('/ok-array-data', (c) =>
    controller.ok(c, 'ok', [
      {
        id: '1',
        name: 'A',
        createdAt: '2024-01-01',
        createdBy: 'x',
        updatedAt: '2024-01-01',
        updatedBy: 'x',
      },
      {
        id: '2',
        name: 'B',
        createdAt: '2024-01-01',
        createdBy: 'x',
        updatedAt: '2024-01-01',
        updatedBy: 'x',
      },
    ]),
  );
  app.get('/ok-nested-data', (c) =>
    controller.ok(c, 'ok', {
      id: '1',
      place: {
        displayName: 'Tokyo',
        createdAt: 'should-be-stripped',
      },
    }),
  );
  app.get('/ok-primitive', (c) => controller.ok(c, 'ok', 'just a string'));
  app.get('/ok-null-data', (c) => controller.ok(c, 'ok', null));
  app.get('/client-error', (c) => controller.clientError(c));
  app.get('/client-error-custom', (c) => controller.clientError(c, 'Missing field'));
  app.get('/not-found', (c) => controller.notFoundError(c));
  app.get('/not-found-custom', (c) => controller.notFoundError(c, 'Album not found'));
  app.get('/unauthorized', (c) => controller.unauthorized(c));
  app.get('/unauthorized-custom', (c) => controller.unauthorized(c, 'Token expired'));
  app.get('/forbidden', (c) => controller.insufficientPermission(c));
  app.get('/forbidden-custom', (c) => controller.insufficientPermission(c, 'Admin only'));
  app.get('/conflict', (c) => controller.conflictError(c));
  app.get('/conflict-custom', (c) => controller.conflictError(c, 'ID taken'));
  app.get('/fail', (c) => controller.fail(c, 'Something broke'));

  return app;
}

const app = createApp();

describe('BaseController', () => {
  /* ------------------------------------------------------------------ */
  /* stripAuditFields via ok()                                          */
  /* ------------------------------------------------------------------ */
  describe('stripAuditFields', () => {
    it('should strip createdAt, createdBy, updatedAt, updatedBy from data', async () => {
      const res = await app.request('/ok-with-data');
      const body = await res.json();

      expect(body.data).toEqual({ id: '1', name: 'Test' });
      expect(body.data.createdAt).toBeUndefined();
      expect(body.data.createdBy).toBeUndefined();
      expect(body.data.updatedAt).toBeUndefined();
      expect(body.data.updatedBy).toBeUndefined();
    });

    it('should strip audit fields from each item in an array', async () => {
      const res = await app.request('/ok-array-data');
      const body = await res.json();

      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toEqual({ id: '1', name: 'A' });
      expect(body.data[1]).toEqual({ id: '2', name: 'B' });
      expect(body.data[0].createdAt).toBeUndefined();
    });

    it('should recursively strip audit fields from nested objects', async () => {
      const res = await app.request('/ok-nested-data');
      const body = await res.json();

      expect(body.data).toEqual({
        id: '1',
        place: { displayName: 'Tokyo' },
      });
      expect(body.data.place.createdAt).toBeUndefined();
    });

    it('should pass through primitive data unchanged', async () => {
      const res = await app.request('/ok-primitive');
      const body = await res.json();

      expect(body.data).toBe('just a string');
    });

    it('should handle null data in ok()', async () => {
      const res = await app.request('/ok-null-data');
      const body = await res.json();

      expect(body.data).toBeNull();
    });
  });

  /* ------------------------------------------------------------------ */
  /* ok()                                                                */
  /* ------------------------------------------------------------------ */
  describe('ok', () => {
    it('should return 200 without data when none provided', async () => {
      const res = await app.request('/ok-no-data');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body).toEqual({ code: 200, status: 'Success', message: 'done' });
      expect(body.data).toBeUndefined();
    });

    it('should return 200 with stripped data', async () => {
      const res = await app.request('/ok-with-data');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(200);
      expect(body.status).toBe('Success');
      expect(body.data).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /* clientError                                                         */
  /* ------------------------------------------------------------------ */
  describe('clientError', () => {
    it('should return 400 with default message', async () => {
      const res = await app.request('/client-error');
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ code: 400, status: 'Bad Request', message: 'Bad Request' });
    });

    it('should return 400 with custom message', async () => {
      const res = await app.request('/client-error-custom');
      const body = await res.json();
      expect(body.message).toBe('Missing field');
    });
  });

  /* ------------------------------------------------------------------ */
  /* notFoundError                                                       */
  /* ------------------------------------------------------------------ */
  describe('notFoundError', () => {
    it('should return 404 with default message', async () => {
      const res = await app.request('/not-found');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ code: 404, status: 'Not Found', message: 'Not Found' });
    });

    it('should return 404 with custom message', async () => {
      const res = await app.request('/not-found-custom');
      const body = await res.json();
      expect(body.message).toBe('Album not found');
    });
  });

  /* ------------------------------------------------------------------ */
  /* unauthorized                                                        */
  /* ------------------------------------------------------------------ */
  describe('unauthorized', () => {
    it('should return 401 with default message', async () => {
      const res = await app.request('/unauthorized');
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ code: 401, status: 'Unauthorized', message: 'Unauthorized' });
    });

    it('should return 401 with custom message', async () => {
      const res = await app.request('/unauthorized-custom');
      const body = await res.json();
      expect(body.message).toBe('Token expired');
    });
  });

  /* ------------------------------------------------------------------ */
  /* insufficientPermission                                              */
  /* ------------------------------------------------------------------ */
  describe('insufficientPermission', () => {
    it('should return 403 with default message', async () => {
      const res = await app.request('/forbidden');
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body).toEqual({ code: 403, status: 'Forbidden', message: 'Forbidden' });
    });

    it('should return 403 with custom message', async () => {
      const res = await app.request('/forbidden-custom');
      const body = await res.json();
      expect(body.message).toBe('Admin only');
    });
  });

  /* ------------------------------------------------------------------ */
  /* conflictError                                                       */
  /* ------------------------------------------------------------------ */
  describe('conflictError', () => {
    it('should return 409 with default message', async () => {
      const res = await app.request('/conflict');
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body).toEqual({
        code: 409,
        status: 'Document already exists',
        message: 'Document already exists',
      });
    });

    it('should return 409 with custom message', async () => {
      const res = await app.request('/conflict-custom');
      const body = await res.json();
      expect(body.message).toBe('ID taken');
    });
  });

  /* ------------------------------------------------------------------ */
  /* fail                                                                */
  /* ------------------------------------------------------------------ */
  describe('fail', () => {
    it('should return 500 with message', async () => {
      const res = await app.request('/fail');
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({
        code: 500,
        status: 'Internal Server Error',
        message: 'Something broke',
      });
    });
  });
});
