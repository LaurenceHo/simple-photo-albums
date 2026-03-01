import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import LocationController from '../controllers/location-controller';
import { HonoEnv } from '../env';
import { LocationSearchSchema } from '../types/request-schemas';

const controller = new LocationController();
const app = new Hono<HonoEnv>();

app.get('/api/location/search', zValidator('query', LocationSearchSchema), controller.findAll);

export default app;
