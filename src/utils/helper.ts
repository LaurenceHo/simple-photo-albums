import type { FilteredAlbumsByYear } from '@/stores/album';
import type { AlbumsWithLocation } from '@/stores/album-locations';
import type { AlbumTags } from '@/stores/album-tags';
import type { TravelRecords } from '@/stores/travel-records';
import {
  ALBUM_TAGS,
  ALBUMS_WITH_LOCATION,
  FILTERED_ALBUMS_BY_YEAR,
  TRAVEL_RECORDS,
} from '@/utils/local-storage-key';

type LocalStorageKey =
  | typeof ALBUMS_WITH_LOCATION
  | typeof ALBUM_TAGS
  | typeof FILTERED_ALBUMS_BY_YEAR
  | typeof TRAVEL_RECORDS;

export interface DbUpdatedTime {
  album: string;
  albumLocations: string;
  albumTags: string;
  travelRecords: string;
}

export const getDataFromLocalStorage = (
  key: LocalStorageKey,
): FilteredAlbumsByYear | AlbumsWithLocation | TravelRecords | AlbumTags | null => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const setDataIntoLocalStorage = (
  key: LocalStorageKey,
  data: FilteredAlbumsByYear | AlbumsWithLocation | TravelRecords | AlbumTags,
) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getStaticFileUrl = (objectKey: string): string => {
  return `${import.meta.env.VITE_STATIC_FILES_URL}/${objectKey}`;
};

export const fetchDbUpdatedTime = async (): Promise<DbUpdatedTime | null> => {
  try {
    const response = await fetch(getStaticFileUrl('updateDatabaseAt.json'));
    return await response.json();
  } catch {
    return null;
  }
};

export const compareDbUpdatedTime = async (
  localDbUpdatedTime: string,
  key: keyof DbUpdatedTime,
): Promise<{ isLatest: boolean; dbUpdatedTime: string }> => {
  const remoteDbUpdatedTime = await fetchDbUpdatedTime();
  if (!remoteDbUpdatedTime) {
    return { isLatest: false, dbUpdatedTime: '' };
  }
  const remoteTime = remoteDbUpdatedTime[key];
  return {
    isLatest: localDbUpdatedTime === remoteTime,
    dbUpdatedTime: remoteTime,
  };
};

export const getYearOptions = () => {
  const yearOptions = ['na'];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; 2005 <= i; i--) {
    yearOptions.push(String(i));
  }
  return yearOptions;
};

export const sortByKey = <T>(array: T[], key: keyof T, sortOrder: 'asc' | 'desc'): T[] => {
  // Create a shallow copy of the array to avoid mutating the input
  const sortedArray = [...array];
  return sortedArray.sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    } else {
      return 0;
    }
  });
};

/**
 * Calculates an adaptive step count based on the angular distance between two points.
 * Uses ~10 points per degree of angular distance, clamped to [20, 100].
 */
export const calculateAdaptiveSteps = (
  start: [number, number],
  end: [number, number],
): number => {
  const [lon1, lat1] = start;
  const [lon2, lat2] = end;
  const dLon = Math.abs(lon2 - lon1);
  const dLat = Math.abs(lat2 - lat1);
  const angularDistance = Math.sqrt(dLon * dLon + dLat * dLat);
  return Math.min(100, Math.max(20, Math.round(angularDistance * 10)));
};

export const interpolateGreatCircle = (
  start: [number, number],
  end: [number, number],
  steps?: number,
): [number, number][][] => {
  const resolvedSteps = steps ?? calculateAdaptiveSteps(start, end);

  // Destructure start and end coordinates into longitude and latitude
  const [lon1, lat1] = start;
  const [lon2, lat2] = end;

  // Converting latitude and longitude from degrees to radians for spherical calculations
  const φ1 = (lat1 * Math.PI) / 180; // Latitude of start point in radians
  const φ2 = (lat2 * Math.PI) / 180; // Latitude of end point in radians
  const λ1 = (lon1 * Math.PI) / 180; // Longitude of start point in radians
  const λ2 = (lon2 * Math.PI) / 180; // Longitude of end point in radians

  // Adjusting the longitude difference to find the shortest path across the antimeridian
  let Δλ = λ2 - λ1; // Initial difference in longitude
  if (Δλ > Math.PI) Δλ -= 2 * Math.PI; // Adjust if crossing more than 180° eastward
  if (Δλ < -Math.PI) Δλ += 2 * Math.PI; // Adjust if crossing more than 180° westward

  // Calculating the great-circle distance using the haversine formula
  const a = Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2; // Haversine intermediate value
  const distance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Angular distance in radians

  // Compute perpendicular direction for arc curvature offset
  const dLon = lon2 - lon1;
  const dLat = lat2 - lat1;
  const pathLength = Math.sqrt(dLon * dLon + dLat * dLat); // Euclidean distance in degrees
  // Perpendicular unit vector (rotated 90° counter-clockwise)
  const perpLon = pathLength > 0 ? -dLat / pathLength : 0;
  const perpLat = pathLength > 0 ? dLon / pathLength : 0;
  // Curvature magnitude scales with distance, capped for very long routes
  const curveMagnitude = Math.min(pathLength * 0.15, 8);

  // Initializing an array to store the interpolated points along the arc path
  const points: [number, number][] = [];
  for (let i = 0; i <= resolvedSteps; i++) {
    // Calculating the interpolation factor for the current step
    const f = i / resolvedSteps;
    // Computing coefficients for spherical linear interpolation
    const A = Math.sin((1 - f) * distance) / Math.sin(distance); // Weight for start point
    const B = Math.sin(f * distance) / Math.sin(distance); // Weight for end point

    // Performing spherical interpolation to get Cartesian coordinates
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2); // X component
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2); // Y component
    const z = A * Math.sin(φ1) + B * Math.sin(φ2); // Z component

    // Converting back to spherical coordinates (latitude and longitude)
    const φ = Math.atan2(z, Math.sqrt(x * x + y * y)); // Latitude in radians
    const λ = Math.atan2(y, x); // Longitude in radians

    // Converting back to degrees
    let lon = (λ * 180) / Math.PI; // Longitude in degrees
    let lat = (φ * 180) / Math.PI; // Latitude in degrees

    // Apply smooth arc curvature perpendicular to the path using sine curve
    const arcOffset = curveMagnitude * Math.sin(f * Math.PI);
    lon += arcOffset * perpLon;
    lat += arcOffset * perpLat;

    // Normalizing longitude to the [-180, 180] range and handling antimeridian transition
    lon = ((lon + 540) % 360) - 180; // Normalize to [-180, 180]
    if (i > 0) {
      const prevPoint = points[i - 1];
      if (prevPoint && Math.abs(lon - prevPoint[0]) > 180) {
        // Adjusting longitude to prevent abrupt jumps across antimeridian
        lon = lon < 0 ? lon + 360 : lon - 360;
      }
    }
    points.push([Number(lon.toFixed(6)), Number(lat.toFixed(6))]); // Store with 6 decimal precision
  }

  // Returning the points as a single segment array
  return [points];
};
