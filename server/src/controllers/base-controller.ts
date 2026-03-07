import { Context } from 'hono';
import { ApiResponse } from '../types/api-response';
import { BaseController as IBaseController } from '../types/models';

const AUDIT_FIELDS = new Set(['createdAt', 'createdBy', 'updatedAt', 'updatedBy']);

/**
 * Recursively strips audit fields (createdAt, createdBy, updatedAt, updatedBy)
 * from plain objects and arrays before sending to the client.
 */
function stripAuditFields<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => stripAuditFields(item)) as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (AUDIT_FIELDS.has(key)) {
      continue;
    }
    result[key] = typeof value === 'object' && value !== null ? stripAuditFields(value) : value;
  }
  return result as T;
}

export abstract class BaseController implements IBaseController {
  abstract findAll(c: Context): Promise<Response>;

  abstract findOne(c: Context): Promise<Response>;

  abstract create(c: Context): Promise<Response>;

  abstract update(c: Context): Promise<Response>;

  abstract delete(c: Context): Promise<Response>;

  public ok<T>(c: Context, message = 'ok', data?: T) {
    const response: ApiResponse<T> = {
      code: 200,
      status: 'Success',
      message,
    };
    if (data !== undefined) {
      response.data = stripAuditFields(data);
    }
    return c.json(response, 200);
  }

  public clientError(c: Context, message = 'Bad Request') {
    const response: ApiResponse<null> = {
      code: 400,
      status: 'Bad Request',
      message,
    };
    return c.json(response, 400);
  }

  public notFoundError(c: Context, message = 'Not Found') {
    const response: ApiResponse<null> = {
      code: 404,
      status: 'Not Found',
      message,
    };
    return c.json(response, 404);
  }

  public unauthorized(c: Context, message = 'Unauthorized') {
    const response: ApiResponse<null> = {
      code: 401,
      status: 'Unauthorized',
      message,
    };
    return c.json(response, 401);
  }

  public insufficientPermission(c: Context, message = 'Forbidden') {
    const response: ApiResponse<null> = {
      code: 403,
      status: 'Forbidden',
      message,
    };
    return c.json(response, 403);
  }

  public conflictError(c: Context, message = 'Document already exists') {
    const response: ApiResponse<null> = {
      code: 409,
      status: 'Document already exists',
      message,
    };
    return c.json(response, 409);
  }

  public fail(c: Context, message: string) {
    const response: ApiResponse<null> = {
      code: 500,
      status: 'Internal Server Error',
      message,
    };
    return c.json(response, 500);
  }
}
