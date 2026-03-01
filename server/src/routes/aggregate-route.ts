import { Hono } from 'hono';
import AggregateController from '../controllers/aggregate-controller';
import { HonoEnv } from '../env';
import { optionalVerifyJwtClaim } from './auth-middleware';

const controller = new AggregateController();
const app = new Hono<HonoEnv>();

app.get('/api/aggregate/:type', optionalVerifyJwtClaim, controller.findOne);

export default app;
