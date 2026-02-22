import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { verifyJwt } from '../utils/jwt.js';
import { HonoEnv } from '../env.js';
import { UserPermission } from '../types/user-permission';

export const setJwtCookies = async (c: Context, token: string) => {
  const expiresIn = 1000 * 60 * 60 * 24 * 7; // 7 days
  setCookie(c, 'jwt', token, {
    expires: new Date(Date.now() + expiresIn),
    httpOnly: true,
    secure: true,
    sameSite: 'None', // FIXME: Change to 'Strict' when development is done
    path: '/',
  });
  c.header('Cache-Control', 'private');
};

/**
 * Clean cookie and return 401
 * @param c Context
 * @param message Message to return
 * @param code HTTP status code
 */
export const cleanJwtCookie = (c: Context, message: string, code = 401) => {
  setCookie(c, 'jwt', '', { maxAge: 0, path: '/' });
  return c.json({ message }, code as any);
};

/**
 * Verify JWT claim
 */
export const verifyJwtClaim = createMiddleware<HonoEnv>(async (c, next) => {
  const token = getCookie(c, 'jwt');
  if (token) {
    try {
      const user = await verifyJwt<UserPermission>(token, c.env.JWT_SECRET);
      c.set('user', user);
      return await next();
    } catch (error) {
      return cleanJwtCookie(c, 'Authentication failed. Please login.');
    }
  } else {
    return cleanJwtCookie(c, 'Authentication failed. Please login.');
  }
});

export const optionalVerifyJwtClaim = createMiddleware<HonoEnv>(async (c, next) => {
  const token = getCookie(c, 'jwt');
  if (token) {
    try {
      const user = await verifyJwt<UserPermission>(token, c.env.JWT_SECRET);
      c.set('user', user);
    } catch (error) {
      // Ignore invalid token
    }
  }
  return await next();
});

export const verifyUserPermission = createMiddleware<HonoEnv>(async (c, next) => {
  const user = c.get('user') as UserPermission;
  if (user?.role !== 'admin') {
    return c.json({ message: 'Unauthorized action' }, 403);
  }
  return await next();
});
