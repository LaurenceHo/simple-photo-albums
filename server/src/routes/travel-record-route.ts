import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import TravelRecordController from '../controllers/travel-record-controller';
import { HonoEnv } from '../env';
import { CreateTravelRecordSchema, UpdateTravelRecordSchema } from '../types/request-schemas';
import { verifyJwtClaim, verifyUserPermission } from './auth-middleware';

const controller = new TravelRecordController();
const app = new Hono<HonoEnv>();

app.get('/api/travelRecords', controller.findAll);

app.post(
  '/api/travelRecords/backfill-country',
  verifyJwtClaim,
  verifyUserPermission,
  controller.backfillCountry,
);

app.post(
  '/api/travelRecords',
  verifyJwtClaim,
  verifyUserPermission,
  zValidator('json', CreateTravelRecordSchema),
  controller.create,
);

app.put(
  '/api/travelRecords',
  verifyJwtClaim,
  verifyUserPermission,
  zValidator('json', UpdateTravelRecordSchema),
  controller.update,
);

app.delete('/api/travelRecords/:recordId', verifyJwtClaim, verifyUserPermission, controller.delete);

export default app;
