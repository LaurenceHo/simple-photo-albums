import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import AlbumTagController from '../controllers/album-tag-controller';
import { HonoEnv } from '../env';
import { CreateTagSchema } from '../types/request-schemas';
import { verifyJwtClaim, verifyUserPermission } from './auth-middleware';

const controller = new AlbumTagController();
const app = new Hono<HonoEnv>();

app.get('/api/album-tags', controller.findAll);

app.post(
  '/api/album-tags',
  verifyJwtClaim,
  verifyUserPermission,
  zValidator('json', CreateTagSchema),
  controller.create,
);

app.delete('/api/album-tags/:tagId', verifyJwtClaim, verifyUserPermission, controller.delete);

export default app;
