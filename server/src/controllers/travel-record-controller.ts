import { Context } from 'hono';
import { HonoEnv } from '../env.js';
import TravelRecordService from '../services/travel-record-service.js';
import { TravelRecord } from '../types/travel-record';
import { UserPermission } from '../types/user-permission.js';
import { haversineDistance, isValidCoordination } from '../utils/helpers.js';
import { BaseController } from './base-controller.js';

export default class TravelRecordController extends BaseController {
  findAll = async (c: Context<HonoEnv>) => {
    const travelRecordService = new TravelRecordService(c.env.DB);
    try {
      const travelRecords: TravelRecord[] = await travelRecordService.getAll();
      return this.ok<TravelRecord[]>(c, 'ok', travelRecords);
    } catch (err: any) {
      console.error(`Failed to fetch travel records from D1: ${err.message}`);
      return this.fail(c, 'Failed to query travel records');
    }
  };

  create = async (c: Context<HonoEnv>) => {
    const body = await c.req.json<TravelRecord>();
    const user = c.get('user') as UserPermission;
    const userEmail = user?.email ?? 'unknown';
    const travelRecordService = new TravelRecordService(c.env.DB);

    // TODO: If departure and destination are present, calculate the distance using latitude and longitude
    // If airline and flight number are present, calculate the distance using flight API
    // If all of them are present, calculate the distance using the latitude and longitude

    let distance = 0;
    if (body.departure && body.destination) {
      if (
        !isValidCoordination(body.departure.location.latitude, body.departure.location.longitude) ||
        !isValidCoordination(
          body.destination.location.latitude,
          body.destination.location.longitude,
        )
      ) {
        return this.fail(c, 'Invalid coordinates');
      }

      const rawDistance = haversineDistance(
        body.departure.location.latitude,
        body.departure.location.longitude,
        body.destination.location.latitude,
        body.destination.location.longitude,
      );

      distance = Math.round(rawDistance);
    }

    const payload: TravelRecord = {
      ...body,
      distance,
      createdBy: userEmail,
      updatedBy: userEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await travelRecordService.create(payload);
      return this.ok(c, 'Travel record created');
    } catch (err: any) {
      console.error(`Failed to create travel record in D1: ${err.message}`);
      return this.fail(c, 'Failed to create travel record');
    }
  };

  update = async (c: Context<HonoEnv>) => {
    const body = await c.req.json<TravelRecord>();
    const user = c.get('user') as UserPermission;
    const userEmail = user?.email ?? 'unknown';
    const travelRecordService = new TravelRecordService(c.env.DB);

    const payload: any = { ...body };
    delete payload.id;
    delete payload.createdAt;
    delete payload.createdBy;

    payload.updatedBy = userEmail;
    payload.updatedAt = new Date().toISOString();

    try {
      await travelRecordService.update(payload.id, payload);
      return this.ok(c, 'Travel record updated');
    } catch (err: any) {
      console.error(`Failed to update travel record in D1: ${err.message}`);
      return this.fail(c, 'Failed to update travel record');
    }
  };

  delete = async (c: Context<HonoEnv>) => {
    const recordId = c.req.param('recordId');
    console.log('##### Delete travel record: %s', recordId);
    const travelRecordService = new TravelRecordService(c.env.DB);

    try {
      await travelRecordService.delete(recordId);
      return this.ok(c, 'Travel record deleted');
    } catch (err: any) {
      console.error(`Failed to delete travel record in D1: ${err.message}`);
      return this.fail(c, 'Failed to delete travel record');
    }
  };

  findOne = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };
}
