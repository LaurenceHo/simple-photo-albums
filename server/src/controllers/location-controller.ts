import { Context } from 'hono';
import { getLocation } from '../services/location-service';
import { Place } from '../types';
import { BaseController } from './base-controller';

export default class LocationController extends BaseController {
  // Find places by keyword
  findAll = async (c: Context) => {
    const textQuery = c.req.query('textQuery');
    if (!textQuery?.trim()) {
      return this.clientError(c, 'textQuery parameter is required');
    }
    try {
      const response: any = await getLocation(
        textQuery,
        'places.formattedAddress,places.displayName,places.location,places.addressComponents',
      );
      let places: Place[] = [];
      if (response.places) {
        places = response.places.map((place: any) => {
          const { displayName, formattedAddress, location, addressComponents } = place;
          const countryComponent = addressComponents?.find((c: any) =>
            c.types?.includes('country'),
          );
          return {
            displayName: displayName.text,
            formattedAddress,
            location,
            country: countryComponent?.shortText,
          };
        });
      }
      return this.ok<Place[]>(c, 'ok', places);
    } catch (err: any) {
      console.error(`Location API error: ${err.message}`);
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
