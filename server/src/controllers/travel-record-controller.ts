import { Context } from 'hono';
import { HonoEnv } from '../env';
import AlbumService from '../services/album-service';
import FlightService, { FlightNotFoundError } from '../services/flight-service';
import { reverseGeocodeCountry } from '../services/location-service';
import TravelRecordService from '../services/travel-record-service';
import { Album } from '../types/album';
import { TravelRecord } from '../types/travel-record';
import { UserPermission } from '../types/user-permission';
import { haversineDistance, isValidCoordination } from '../utils/helpers';
import { BaseController } from './base-controller';

interface BackfillItem {
  type: 'travel-record' | 'album';
  id: string;
  record?: TravelRecord;
  album?: Album;
}

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

    const isFlightApiMode =
      body.transportType === 'flight' && body.flightNumber && !body.departure && !body.destination;

    let distance = 0;
    let flightData: Partial<TravelRecord> = {};

    if (isFlightApiMode && body.flightNumber) {
      // Flight API mode: auto-populate from AeroDataBox
      const apiKey = c.env.RAPIDAPI_KEY;
      if (!apiKey) {
        return this.fail(c, 'RAPIDAPI_KEY is not configured');
      }

      try {
        const flightService = new FlightService(apiKey);
        const date = body.travelDate.substring(0, 10);
        const result = await flightService.getFlightByNumber(body.flightNumber, date);

        flightData = {
          departure: result.departure,
          destination: result.destination,
          airline: result.airline,
          flightNumber: result.flightNumber,
          aircraftType: result.aircraftType,
          distance: result.distance,
          durationMinutes: result.durationMinutes,
        };
        distance = result.distance;
      } catch (err: any) {
        console.error(`Flight API error: ${err.message}`);
        if (err instanceof FlightNotFoundError) {
          return this.notFoundError(c, 'No flight data found for the given flight number and date');
        }
        return this.fail(c, 'Failed to fetch flight data from provider');
      }
    } else if (body.departure && body.destination) {
      // Manual mode: calculate distance from coordinates
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
      ...flightData,
      id: crypto.randomUUID(),
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

    const id = body.id;
    if (!id) {
      return this.clientError(c, 'Record ID is required for update');
    }
    const payload: any = { ...body };
    delete payload.id;
    delete payload.createdAt;
    delete payload.createdBy;

    payload.updatedBy = userEmail;
    payload.updatedAt = new Date().toISOString();

    try {
      await travelRecordService.update(id, payload);
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

  /**
   * One-time backfill endpoint that reverse-geocodes missing `country` fields
   * on departure/destination places in existing travel records and album places.
   *
   * Processes a limited batch per invocation to stay within Cloudflare Workers'
   * subrequest limit (50). Call repeatedly until `remaining` is 0.
   *
   * Query params:
   *   - `limit` (default 10): max records to geocode per invocation
   */
  backfillCountry = async (c: Context<HonoEnv>) => {
    const apiKey = c.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return this.fail(c, 'GOOGLE_PLACES_API_KEY is not configured');
    }

    const user = c.get('user') as UserPermission;
    const userEmail = user?.email ?? 'system-backfill';
    const limit = Math.min(Number(c.req.query('limit')) || 10, 20);

    try {
      const pendingItems = await this.collectPendingItems(c.env.DB);
      const batch = pendingItems.slice(0, limit);
      let updated = 0;
      let failed = 0;

      for (const item of batch) {
        const success = await this.geocodeAndUpdate(item, apiKey, userEmail, c.env.DB);
        if (success) {
          updated++;
        } else {
          failed++;
        }
      }

      return this.ok(c, 'Backfill complete', {
        updated,
        failed,
        remaining: Math.max(0, pendingItems.length - batch.length),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to backfill country: ${message}`);
      return this.fail(c, 'Failed to backfill country');
    }
  };

  private async collectPendingItems(db: D1Database): Promise<BackfillItem[]> {
    const items: BackfillItem[] = [];

    const travelRecordService = new TravelRecordService(db);
    const records = await travelRecordService.getAll();
    for (const record of records) {
      if (!record.id) continue;
      const needsDeparture = record.departure && !record.departure.country;
      const needsDestination = record.destination && !record.destination.country;
      if (needsDeparture || needsDestination) {
        items.push({ type: 'travel-record', id: record.id, record });
      }
    }

    const albumService = new AlbumService(db);
    const albums = await albumService.getAll();
    for (const album of albums) {
      if (album.place && !album.place.country) {
        items.push({ type: 'album', id: album.id, album });
      }
    }

    return items;
  }

  private async geocodeAndUpdate(
    item: BackfillItem,
    apiKey: string,
    userEmail: string,
    db: D1Database,
  ): Promise<boolean> {
    if (item.type === 'travel-record' && item.record) {
      return this.geocodeTravelRecord(item.record, apiKey, userEmail, db);
    }
    if (item.type === 'album' && item.album) {
      return this.geocodeAlbum(item.album, apiKey, userEmail, db);
    }
    return false;
  }

  private async geocodeTravelRecord(
    record: TravelRecord,
    apiKey: string,
    userEmail: string,
    db: D1Database,
  ): Promise<boolean> {
    const departure = record.departure
      ? { ...record.departure, location: { ...record.departure.location } }
      : undefined;
    const destination = record.destination
      ? { ...record.destination, location: { ...record.destination.location } }
      : undefined;

    let changed = false;

    if (departure && !departure.country) {
      console.log(
        `Backfill departure for record ${record.id}: lat=${departure.location.latitude}, lng=${departure.location.longitude}`,
      );
      const country = await reverseGeocodeCountry(
        departure.location.latitude,
        departure.location.longitude,
        apiKey,
      );
      console.log(`  -> departure country resolved: ${country ?? 'undefined'}`);
      if (country) {
        departure.country = country;
        changed = true;
      }
    }

    if (destination && !destination.country) {
      console.log(
        `Backfill destination for record ${record.id}: lat=${destination.location.latitude}, lng=${destination.location.longitude}`,
      );
      const country = await reverseGeocodeCountry(
        destination.location.latitude,
        destination.location.longitude,
        apiKey,
      );
      console.log(`  -> destination country resolved: ${country ?? 'undefined'}`);
      if (country) {
        destination.country = country;
        changed = true;
      }
    }

    if (!changed) {
      console.log(`Skipping record ${record.id}: geocoding returned no country`);
      return false;
    }

    const updatePayload: Partial<TravelRecord> = {
      updatedBy: userEmail,
      updatedAt: new Date().toISOString(),
    };
    if (departure) updatePayload.departure = departure;
    if (destination) updatePayload.destination = destination;

    console.log(
      `Updating record ${record.id} with departure.country=${departure?.country}, destination.country=${destination?.country}`,
    );
    const travelRecordService = new TravelRecordService(db);
    await travelRecordService.update(record.id!, updatePayload);
    return true;
  }

  private async geocodeAlbum(
    album: Album,
    apiKey: string,
    userEmail: string,
    db: D1Database,
  ): Promise<boolean> {
    if (!album.place) return false;

    const place = { ...album.place, location: { ...album.place.location } };
    console.log(
      `Backfill place for album ${album.id}: lat=${place.location.latitude}, lng=${place.location.longitude}`,
    );
    const country = await reverseGeocodeCountry(
      place.location.latitude,
      place.location.longitude,
      apiKey,
    );
    console.log(`  -> album country resolved: ${country ?? 'undefined'}`);

    if (!country) {
      console.log(`Skipping album ${album.id}: geocoding returned no country`);
      return false;
    }

    place.country = country;
    const albumService = new AlbumService(db);
    await albumService.update(album.id, {
      place,
      updatedBy: userEmail,
      updatedAt: new Date().toISOString(),
    } as Album);
    return true;
  }

  findOne = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };
}
