import { DOMParser } from '@xmldom/xmldom';
import { Hono } from 'hono';

// Polyfill DOMParser and Node for AWS SDK in Cloudflare Workers
(globalThis as Record<string, unknown>)['DOMParser'] = DOMParser;
// @ts-expect-error - Node is not exported from @xmldom/xmldom/lib/dom but is available at runtime
import { Node } from '@xmldom/xmldom/lib/dom';
(globalThis as Record<string, unknown>)['Node'] = Node;

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
