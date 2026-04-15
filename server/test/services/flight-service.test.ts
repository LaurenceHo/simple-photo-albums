import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FlightService, {
  FlightApiError,
  FlightNotFoundError,
} from '../../src/services/flight-service';

const mockApiResponse = [
  {
    departure: {
      airport: {
        name: 'Tokyo Haneda',
        iata: 'HND',
        municipalityName: 'Tokyo',
        countryCode: 'JP',
        location: { lat: 35.5494, lon: 139.7798 },
      },
      scheduledTime: {
        utc: '2025-01-15T01:55:00Z',
        local: '2025-01-15T10:55+09:00',
      },
    },
    arrival: {
      airport: {
        name: 'Los Angeles International',
        iata: 'LAX',
        municipalityName: 'Los Angeles',
        countryCode: 'US',
        location: { lat: 33.9425, lon: -118.408 },
      },
      scheduledTime: {
        utc: '2025-01-15T11:40:00Z',
        local: '2025-01-15T03:40-08:00',
      },
    },
    number: 'NH 106',
    aircraft: { model: 'Boeing 777-300ER', reg: 'JA795A' },
    airline: { name: 'All Nippon Airways', iata: 'NH', icao: 'ANA' },
    greatCircleDistance: { km: 8819 },
  },
];

describe('FlightService', () => {
  let flightService: FlightService;

  beforeEach(() => {
    flightService = new FlightService('test-api-key');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and map flight data correctly', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    const result = await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(result.departure.displayName).toBe('Tokyo Haneda Airport');
    expect(result.departure.formattedAddress).toBe('Tokyo, JP');
    expect(result.departure.location.latitude).toBe(35.5494);
    expect(result.departure.location.longitude).toBe(139.7798);
    expect(result.departure.country).toBe('JP');
    expect(result.destination.displayName).toBe('Los Angeles International Airport');
    expect(result.destination.formattedAddress).toBe('Los Angeles, US');
    expect(result.destination.location.latitude).toBe(33.9425);
    expect(result.destination.location.longitude).toBe(-118.408);
    expect(result.destination.country).toBe('US');
    expect(result.airline).toBe('All Nippon Airways');
    expect(result.flightNumber).toBe('NH 106');
    expect(result.aircraftType).toBe('Boeing 777-300ER');
    expect(result.distance).toBe(8819);
    expect(result.durationMinutes).toBe(585);
  });

  it('should throw FlightApiError on non-ok API response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(flightService.getFlightByNumber('XX999', '2025-01-15')).rejects.toThrow(
      FlightApiError,
    );
    await expect(flightService.getFlightByNumber('XX999', '2025-01-15')).rejects.toThrow(
      'AeroDataBox API returned 500',
    );
  });

  it('should throw FlightNotFoundError when response is not an array', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'not found' }),
    } as Response);

    await expect(flightService.getFlightByNumber('NH106', '2025-01-15')).rejects.toThrow(
      FlightNotFoundError,
    );
  });

  it('should throw FlightNotFoundError on empty flights array', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    await expect(flightService.getFlightByNumber('NH106', '2025-01-15')).rejects.toThrow(
      FlightNotFoundError,
    );
  });

  it('should handle missing aircraft data gracefully', async () => {
    const responseWithoutAircraft = [{ ...mockApiResponse[0], aircraft: undefined }];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseWithoutAircraft),
    } as Response);

    const result = await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(result.aircraftType).toBeUndefined();
  });

  it('should strip spaces from flight number in URL', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    await flightService.getFlightByNumber('NH 106', '2025-01-15');

    expect(fetch).toHaveBeenCalledWith(
      'https://aerodatabox.p.rapidapi.com/flights/number/NH106/2025-01-15',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('should send correct RapidAPI headers', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'x-rapidapi-host': 'aerodatabox.p.rapidapi.com',
          'x-rapidapi-key': 'test-api-key',
        },
      }),
    );
  });

  it('should pass AbortController signal to fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    await flightService.getFlightByNumber('NH106', '2025-01-15');

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const options = fetchCall?.[1] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('should handle missing greatCircleDistance gracefully', async () => {
    const responseWithoutDistance = [{ ...mockApiResponse[0], greatCircleDistance: undefined }];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseWithoutDistance),
    } as Response);

    const result = await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(result.distance).toBe(0);
  });

  it('should default to "Unknown" when airport name is missing', async () => {
    const noNameResponse = [
      {
        ...mockApiResponse[0],
        departure: {
          airport: { iata: 'HND', location: { lat: 35, lon: 139 } },
          scheduledTime: mockApiResponse[0].departure.scheduledTime,
        },
        arrival: {
          airport: { iata: 'LAX', location: { lat: 33, lon: -118 } },
          scheduledTime: mockApiResponse[0].arrival.scheduledTime,
        },
      },
    ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(noNameResponse),
    } as Response);

    const result = await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(result.departure.displayName).toBe('Unknown');
    expect(result.destination.displayName).toBe('Unknown');
  });

  it('should default formattedAddress to "Unknown" when municipality and country missing', async () => {
    const noAddressResponse = [
      {
        ...mockApiResponse[0],
        departure: {
          airport: { name: 'Test', location: { lat: 0, lon: 0 } },
          scheduledTime: mockApiResponse[0].departure.scheduledTime,
        },
      },
    ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(noAddressResponse),
    } as Response);

    const result = await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(result.departure.formattedAddress).toBe('Unknown');
  });

  it('should default location to 0,0 when airport location missing', async () => {
    const noLocationResponse = [
      {
        ...mockApiResponse[0],
        departure: {
          airport: { name: 'Test' },
          scheduledTime: mockApiResponse[0].departure.scheduledTime,
        },
        arrival: {
          airport: { name: 'Test2' },
          scheduledTime: mockApiResponse[0].arrival.scheduledTime,
        },
      },
    ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(noLocationResponse),
    } as Response);

    const result = await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(result.departure.location).toEqual({ latitude: 0, longitude: 0 });
    expect(result.destination.location).toEqual({ latitude: 0, longitude: 0 });
  });

  it('should set durationMinutes to 0 when scheduled times missing', async () => {
    const noTimesResponse = [
      {
        ...mockApiResponse[0],
        departure: {
          airport: mockApiResponse[0].departure.airport,
          scheduledTime: {},
        },
        arrival: {
          airport: mockApiResponse[0].arrival.airport,
          scheduledTime: {},
        },
      },
    ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(noTimesResponse),
    } as Response);

    const result = await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(result.durationMinutes).toBe(0);
  });

  it('should default airline to "Unknown" when airline name missing', async () => {
    const noAirlineResponse = [{ ...mockApiResponse[0], airline: undefined }];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(noAirlineResponse),
    } as Response);

    const result = await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(result.airline).toBe('Unknown');
  });

  it('should use original flightNumber when flight.number is missing', async () => {
    const noNumberResponse = [{ ...mockApiResponse[0], number: undefined }];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(noNumberResponse),
    } as Response);

    const result = await flightService.getFlightByNumber('QF1', '2025-01-15');

    expect(result.flightNumber).toBe('QF1');
  });

  it('should handle completely missing departure/arrival airport objects', async () => {
    const minimalResponse = [
      {
        ...mockApiResponse[0],
        departure: {},
        arrival: {},
      },
    ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(minimalResponse),
    } as Response);

    const result = await flightService.getFlightByNumber('NH106', '2025-01-15');

    expect(result.departure.displayName).toBe('Unknown');
    expect(result.destination.displayName).toBe('Unknown');
    expect(result.departure.location).toEqual({ latitude: 0, longitude: 0 });
    expect(result.durationMinutes).toBe(0);
  });

  it('should handle FlightApiError with correct name property', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    try {
      await flightService.getFlightByNumber('NH106', '2025-01-15');
      expect.unreachable('should have thrown');
    } catch (err: any) {
      expect(err.name).toBe('FlightApiError');
      expect(err.message).toBe('AeroDataBox API returned 429');
    }
  });

  it('should handle FlightNotFoundError with correct name property', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    try {
      await flightService.getFlightByNumber('NH106', '2025-01-15');
      expect.unreachable('should have thrown');
    } catch (err: any) {
      expect(err.name).toBe('FlightNotFoundError');
      expect(err.message).toBe('No flight data found');
    }
  });
});
