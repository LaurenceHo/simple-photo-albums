import { OAuth2Client } from 'google-auth-library';
import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { signJwt, verifyJwt } from '../utils/jwt.js';
import { HonoEnv } from '../env.js';
import { setJwtCookies } from '../routes/auth-middleware.js';
import UserService from '../services/user-service.js';
import { UserPermission } from '../types/user-permission';
import { BaseController } from './base-controller.js';

// Reference:
// https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
// Google OAuth client
const client = new OAuth2Client();

export default class AuthController extends BaseController {
  // GET /api/auth/userInfo
  readUserInfoFromToken = async (c: Context<HonoEnv>) => {
    try {
      const token = getCookie(c, 'jwt');

      if (!token) {
        return this.ok(c, 'ok');
      }

      try {
        const decoded = await verifyJwt<UserPermission>(token, c.env.JWT_SECRET);
        return this.ok<UserPermission>(c, 'ok', decoded);
      } catch (error: any) {
        console.log('Invalid JWT:', error);
        setCookie(c, 'jwt', '', { maxAge: 0, path: '/' });
        return this.ok(c, 'ok');
      }
    } catch (error: any) {
      console.log('Error reading JWT:', error);
      setCookie(c, 'jwt', '', { maxAge: 0, path: '/' });
      return this.ok(c, 'ok');
    }
  };

  // POST /api/auth/verifyIdToken
  verifyIdToken = async (c: Context<HonoEnv>) => {
    const { token, state } = await c.req.json<{ token: string; state?: string }>();

    try {
      // 1. Verify Google ID token
      const payload = await _verifyIdToken(token, c.env.VITE_GOOGLE_CLIENT_ID);
      const uid = payload?.sub ?? '';
      const email = payload?.email ?? '';
      const auth_time = payload?.iat ?? 0;

      if (!uid || !email) {
        return this.unauthorized(c, 'Invalid Google token');
      }

      // 2. CSRF check
      const storedState = getCookie(c, 'csrf_state');
      if (state !== storedState) {
        console.log(`CSRF state mismatch: ${state} vs ${storedState}`);
        return this.unauthorized(c, 'CSRF token mismatch');
      }

      // 3. Fresh login (last 5 minutes)
      const now = Date.now() / 1000;
      if (now - auth_time >= 5 * 60) {
        return this.fail(c, 'Login session expired');
      }

      // 4. Call UserService to get user permissions
      const userService = new UserService(c.env.DB);
      const userPermission = await userService.findOne({ uid, email });

      if (userPermission) {
        // 5. Sign JWT and set cookies
        const jwtToken = await signJwt(
          userPermission as unknown as Record<string, unknown>,
          c.env.JWT_SECRET,
        );

        await setJwtCookies(c, jwtToken);
        return this.ok<UserPermission>(c, 'ok', userPermission);
      } else {
        console.log(`User ${email} not found in permissions`);
        return this.unauthorized(c, 'User not authorized');
      }
    } catch (err: any) {
      console.error('Error in verifyIdToken:', err);
      return this.fail(c, 'Authentication failed');
    }
  };

  // POST /api/auth/logout
  logout = async (c: Context) => {
    try {
      setCookie(c, 'jwt', '', { maxAge: 0, path: '/' });
      return this.ok(c, 'Logged out');
    } catch (err: any) {
      console.error('Logout error:', err);
      return this.fail(c, 'Logout failed');
    }
  };

  // Stub methods
  findOne = async (_c: Context) => {
    throw new Error('Not implemented');
  };
  findAll = async (_c: Context) => {
    throw new Error('Not implemented');
  };
  create = async (_c: Context) => {
    throw new Error('Not implemented');
  };
  update = async (_c: Context) => {
    throw new Error('Not implemented');
  };
  delete = async (_c: Context) => {
    throw new Error('Not implemented');
  };
}

// Verify Google ID token
const _verifyIdToken = async (token: string, clientId: string) => {
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID not configured');
  }

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: clientId,
  });
  return ticket.getPayload();
};
