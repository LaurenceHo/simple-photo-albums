import { Context } from 'hono';
import type { PlacesSearchResult } from '../services/location-service';
import { getLocation } from '../services/location-service';
import { Place } from '../types';
import { BaseController } from './base-controller';

export default class LocationController extends BaseController {
  /** Find places by keyword. */
  findAll = async (c: Context) => {
    const textQuery = c.req.query('textQuery');
    if (!textQuery?.trim()) {
      return this.clientError(c, 'textQuery parameter is required');
    }
    try {
      const response = await getLocation(
        textQuery,
        'places.formattedAddress,places.displayName,places.location,places.addressComponents',
      );
      const places: Place[] = (response.places ?? []).map((place: PlacesSearchResult) => {
        const { displayName, formattedAddress, location, addressComponents } = place;
        const countryComponent = addressComponents?.find((c) => c.types.includes('country'));
        return {
          displayName: displayName.text,
          formattedAddress,
          location,
          country: countryComponent?.shortText,
        };
      });
      return this.ok<Place[]>(c, 'ok', places);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Location API error: ${message}`);
      return this.fail(c, 'Failed to fetch location data');
    }
  };

  findOne = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };

  create = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };

  delete = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };

  update = async (_c: Context) => {
    throw new Error('Method not implemented.');
  };
}
