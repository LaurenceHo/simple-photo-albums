import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import PhotoController from '../controllers/photo-controller';
import { HonoEnv } from '../env';
import { PhotosRequestSchema, RenamePhotoRequestSchema } from '../types/api-response';
import { verifyJwtClaim, verifyUserPermission } from './auth-middleware';

const controller = new PhotoController();
const app = new Hono<HonoEnv>();

app.get('/api/photos/upload/:albumId', verifyJwtClaim, verifyUserPermission, controller.create);

app.get('/api/photos/:year/:albumId', controller.findAll);

app.put(
  '/api/photos',
  verifyJwtClaim,
  verifyUserPermission,
  zValidator('json', PhotosRequestSchema),
  controller.update,
);

app.put(
  '/api/photos/rename',
  verifyJwtClaim,
  verifyUserPermission,
  zValidator('json', RenamePhotoRequestSchema),
  controller.rename,
);

app.delete(
  '/api/photos',
  verifyJwtClaim,
  verifyUserPermission,
  zValidator('json', PhotosRequestSchema),
  controller.delete,
);

export default app;
