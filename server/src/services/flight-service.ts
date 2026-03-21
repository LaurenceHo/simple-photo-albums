import { Place } from '../types/place';

export class FlightNotFoundError extends Error {
  constructor(message = 'No flight data found') {
    super(message);
    this.name = 'FlightNotFoundError';
  }
}

export class FlightApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlightApiError';
  }
}

export interface FlightData {
  departure: Place;
  destination: Place;
  airline: string;
  flightNumber: string;
  aircraftType?: string;
  distance: number;
  durationMinutes: number;
}

const FLIGHT_API_TIMEOUT_MS = 10_000;

export default class FlightService {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * https://doc.aerodatabox.com/rapidapi.html#/operations/GetFlight_FlightOnSpecificDate
   *
   * Get flight data by flight number and date
   * @param flightNumber Flight number (e.g., "QF123")
   * @param date Date in YYYY-MM-DD format
   * @returns Flight data
   */
  async getFlightByNumber(flightNumber: string, date: string): Promise<FlightData> {
    const sanitizedFlightNumber = flightNumber.replaceAll(/\s/g, '');
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${sanitizedFlightNumber}/${date}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FLIGHT_API_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'aerodatabox.p.rapidapi.com',
          'x-rapidapi-key': this.apiKey,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new FlightApiError(`AeroDataBox API returned ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new FlightNotFoundError();
    }

    const flight = data[0];

    const departureAirport = flight.departure?.airport;
    const arrivalAirport = flight.arrival?.airport;

    const departure: Place = {
      displayName: departureAirport?.name ? departureAirport?.name + ' Airport' : 'Unknown',
      formattedAddress:
        [departureAirport?.municipalityName, departureAirport?.countryCode]
          .filter(Boolean)
          .join(', ') || 'Unknown',
      location: {
        latitude: departureAirport?.location?.lat ?? 0,
        longitude: departureAirport?.location?.lon ?? 0,
      },
      country: departureAirport?.countryCode,
    };

    const destination: Place = {
      displayName: arrivalAirport?.name ? arrivalAirport?.name + ' Airport' : 'Unknown',
      formattedAddress:
        [arrivalAirport?.municipalityName, arrivalAirport?.countryCode]
          .filter(Boolean)
          .join(', ') || 'Unknown',
      location: {
        latitude: arrivalAirport?.location?.lat ?? 0,
        longitude: arrivalAirport?.location?.lon ?? 0,
      },
      country: arrivalAirport?.countryCode,
    };

    let durationMinutes = 0;
    const depTime = flight.departure?.scheduledTime?.utc;
    const arrTime = flight.arrival?.scheduledTime?.utc;
    if (depTime && arrTime) {
      const depDate = new Date(depTime);
      const arrDate = new Date(arrTime);
      durationMinutes = Math.round((arrDate.getTime() - depDate.getTime()) / 60000);
    }

    const distance = flight.greatCircleDistance?.km ?? 0;
    const aircraftType = flight.aircraft?.model;
    const airline = flight.airline?.name ?? 'Unknown';

    return {
      departure,
      destination,
      airline,
      flightNumber: flight.number ?? flightNumber,
      aircraftType,
      distance: Math.round(distance),
      durationMinutes,
    };
  }
}
