import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import AlbumTagController from '../controllers/album-tag-controller';
import { HonoEnv } from '../env';
import { CreateTagSchema } from '../types/request-schemas';
import { verifyJwtClaim, verifyUserPermission } from './auth-middleware';

const controller = new AlbumTagController();
const app = new Hono<HonoEnv>();

app.get('/api/albumTags', controller.findAll);

app.post(
  '/api/albumTags',
  verifyJwtClaim,
  verifyUserPermission,
  zValidator('json', CreateTagSchema),
  controller.create,
);

app.delete('/api/albumTags/:tagId', verifyJwtClaim, verifyUserPermission, controller.delete);

export default app;
