import { Context } from 'hono';
import { getLocation } from '../services/location-service.js';
import { Place } from '../types';
import { BaseController } from './base-controller.js';

export default class LocationController extends BaseController {
  // Find places by keyword
  findAll = async (c: Context) => {
    const textQuery = c.req.query('textQuery');
    const response: any = await getLocation(
      textQuery!,
      'places.formattedAddress,places.displayName,places.location',
    );
    let places: Place[] = [];
    if (response.places) {
      places = response.places.map((place: any) => {
        const { displayName, formattedAddress, location } = place;
        return {
          displayName: displayName.text,
          formattedAddress,
          location,
        };
      });
    }
    if (!response.error) {
      return this.ok<Place[]>(c, 'ok', places);
    } else {
      return this.fail(c, response.error.message);
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
