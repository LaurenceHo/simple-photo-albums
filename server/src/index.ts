import { DOMParser } from '@xmldom/xmldom';
import { Hono } from 'hono';

// Polyfill DOMParser and Node for AWS SDK in Cloudflare Workers
globalThis.DOMParser = DOMParser as any;
// @ts-expect-error - Node is not exported from @xmldom/xmldom/lib/dom but is available at runtime
import { Node } from '@xmldom/xmldom/lib/dom';
globalThis.Node = Node as any;

import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { HonoEnv } from './env';
import aggregateRoute from './routes/aggregate-route';
import albumRoute from './routes/album-route';
import albumTagsRoute from './routes/album-tag-route';
import authRoute from './routes/auth-route';
import locationRoute from './routes/location-route';
import photoRoute from './routes/photo-route';
import travelRecordRoute from './routes/travel-record-route';

const app = new Hono<HonoEnv>();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: (origin) => {
      const allowedOrigins = [];
      if (c.env.DEVELOPMENT === 'true') {
        allowedOrigins.push('http://localhost:9000');
      } else {
        allowedOrigins.push(c.env.ALBUM_URL);
      }

      if (!origin || allowedOrigins.includes(origin)) {
        return origin;
      }
      return allowedOrigins[0]; // Fallback
    },
    allowHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Polyfill process.env for AWS SDK
app.use('*', async (c, next) => {
  if (c.env.AWS_S3_BUCKET_NAME) process.env['AWS_S3_BUCKET_NAME'] = c.env.AWS_S3_BUCKET_NAME;
  if (c.env.AWS_REGION_NAME) process.env['AWS_REGION_NAME'] = c.env.AWS_REGION_NAME;
  if (c.env.VITE_IMAGEKIT_CDN_URL)
    process.env['VITE_IMAGEKIT_CDN_URL'] = c.env.VITE_IMAGEKIT_CDN_URL;
  if (c.env.AWS_ACCESS_KEY_ID) process.env['AWS_ACCESS_KEY_ID'] = c.env.AWS_ACCESS_KEY_ID;
  if (c.env.AWS_SECRET_ACCESS_KEY)
    process.env['AWS_SECRET_ACCESS_KEY'] = c.env.AWS_SECRET_ACCESS_KEY;
  if (c.env.JWT_SECRET) process.env['JWT_SECRET'] = c.env.JWT_SECRET;
  if (c.env.GOOGLE_PLACES_API_KEY)
    process.env['GOOGLE_PLACES_API_KEY'] = c.env.GOOGLE_PLACES_API_KEY;
  if (c.env.VITE_GOOGLE_CLIENT_ID)
    process.env['VITE_GOOGLE_CLIENT_ID'] = c.env.VITE_GOOGLE_CLIENT_ID;
  if (c.env.ALBUM_URL) process.env['ALBUM_URL'] = c.env.ALBUM_URL;
  if (c.env.RAPIDAPI_KEY) process.env['RAPIDAPI_KEY'] = c.env.RAPIDAPI_KEY;
  if (c.env.DEVELOPMENT) process.env['DEVELOPMENT'] = c.env.DEVELOPMENT;

  await next();
});

// Routes
app.route('/', aggregateRoute);
app.route('/', albumRoute);
app.route('/', albumTagsRoute);
app.route('/', authRoute);
app.route('/', locationRoute);
app.route('/', photoRoute);
app.route('/', travelRecordRoute);

// Error handling
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: err.message }, 500);
});

export default app;
