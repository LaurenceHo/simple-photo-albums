import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import TravelRecordController from '../controllers/travel-record-controller';
import { HonoEnv } from '../env';
import { CreateTravelRecordSchema, UpdateTravelRecordSchema } from '../types/request-schemas';
import { verifyJwtClaim, verifyUserPermission } from './auth-middleware';

const controller = new TravelRecordController();
const app = new Hono<HonoEnv>();

app.get('/api/travel-records', controller.findAll);

app.post(
  '/api/travel-records',
  verifyJwtClaim,
  verifyUserPermission,
  zValidator('json', CreateTravelRecordSchema),
  controller.create,
);

app.put(
  '/api/travel-records',
  verifyJwtClaim,
  verifyUserPermission,
  zValidator('json', UpdateTravelRecordSchema),
  controller.update,
);

app.delete('/api/travel-records/:recordId', verifyJwtClaim, verifyUserPermission, controller.delete);

export default app;
