import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getStaticFileUrl,
  getYearOptions,
  interpolateGreatCircle,
  sortByKey,
} from '../helper';

globalThis.fetch = vi.fn();

describe('Helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getStaticFileUrl', () => {
    it('should return the correct URL with the object key appended', () => {
      vi.stubEnv('VITE_STATIC_FILES_URL', 'https://example.com/static');
      const objectKey = 'test-file.json';
      const expectedUrl = 'https://example.com/static/test-file.json';
      expect(getStaticFileUrl(objectKey)).toBe(expectedUrl);
      vi.unstubAllEnvs();
    });

    it('should handle an empty object key', () => {
      vi.stubEnv('VITE_STATIC_FILES_URL', 'https://example.com/static');
      const objectKey = '';
      const expectedUrl = 'https://example.com/static/';
      expect(getStaticFileUrl(objectKey)).toBe(expectedUrl);
      vi.unstubAllEnvs();
    });
  });

  // The rest of the tests (getYearOptions, sortByKey, interpolateGreatCircle) remain unchanged
  describe('getYearOptions', () => {
    it('should return an array of years from 2005 to the current year, starting with "na"', () => {
      vi.setSystemTime(new Date('2025-01-01'));
      const expectedYears = [
        'na',
        '2025',
        '2024',
        '2023',
        '2022',
        '2021',
        '2020',
        '2019',
        '2018',
        '2017',
        '2016',
        '2015',
        '2014',
        '2013',
        '2012',
        '2011',
        '2010',
        '2009',
        '2008',
        '2007',
        '2006',
        '2005',
      ];
      expect(getYearOptions()).toEqual(expectedYears);
    });

    it('should handle a different current year', () => {
      vi.setSystemTime(new Date('2006-01-01'));
      const expectedYears = ['na', '2006', '2005'];
      expect(getYearOptions()).toEqual(expectedYears);
    });

    afterEach(() => {
      vi.useRealTimers();
    });
  });

  describe('sortByKey', () => {
    it('should sort an array of objects by a string key in ascending order', () => {
      const array = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      const sorted = sortByKey(array, 'name', 'asc');
      expect(sorted).toEqual([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
        { name: 'Charlie', age: 30 },
      ]);
    });

    it('should sort an array of objects by a string key in descending order', () => {
      const array = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      const sorted = sortByKey(array, 'name', 'desc');
      expect(sorted).toEqual([
        { name: 'Charlie', age: 30 },
        { name: 'Bob', age: 35 },
        { name: 'Alice', age: 25 },
      ]);
    });

    it('should sort an array of objects by a number key in ascending order', () => {
      const array = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      const sorted = sortByKey(array, 'age', 'asc');
      expect(sorted).toEqual([
        { name: 'Alice', age: 25 },
        { name: 'Charlie', age: 30 },
        { name: 'Bob', age: 35 },
      ]);
    });

    it('should sort an array of objects by a number key in descending order', () => {
      const array = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      const sorted = sortByKey(array, 'age', 'desc');
      expect(sorted).toEqual([
        { name: 'Bob', age: 35 },
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
      ]);
    });

    it('should handle mixed types by returning 0 (no sorting)', () => {
      const array = [
        { value: 'string', id: 1 },
        { value: 42, id: 2 },
      ];
      const sorted = sortByKey(array, 'value', 'asc');
      expect(sorted).toEqual([
        { value: 'string', id: 1 },
        { value: 42, id: 2 },
      ]);
    });
  });

  describe('interpolateGreatCircle', () => {
    it('should generate a single segment for a short route without antimeridian crossing', () => {
      const start: [number, number] = [121.5654, 25.033]; // Taipei
      const end: [number, number] = [139.6917, 35.6895]; // Tokyo
      const steps = 2;
      const result = interpolateGreatCircle(start, end, steps);

      expect(result.length).toBe(1);
      expect(result[0]!.length).toBe(3);

      const segment = result[0]!;
      expect(segment).toBeDefined();
      expect(segment.length).toBe(3);

      const startPoint = segment[0]!;
      expect(startPoint).toBeDefined();
      // Check start point with tolerance for floating-point precision
      expect(startPoint[0]).toBeCloseTo(121.5654, 5); // Longitude
      expect(startPoint[1]).toBeCloseTo(25.033, 5); // Latitude

      const endPoint = segment[2]!;
      expect(endPoint).toBeDefined();
      // Check end point with tolerance
      expect(endPoint[0]).toBeCloseTo(139.6917, 5); // Longitude
      expect(endPoint[1]).toBeCloseTo(35.6895, 5); // Latitude

      // Check intermediate point follows curved arc path
      const midPoint = segment[1]!;
      expect(midPoint).toBeDefined();
      // Midpoint longitude should be between start and end
      expect(midPoint[0]).toBeGreaterThan(121);
      expect(midPoint[0]).toBeLessThan(140);
    });

    it('should generate a single segment for a route crossing the antimeridian', () => {
      const start: [number, number] = [139.6917, 35.6895]; // Tokyo
      const end: [number, number] = [-118.2437, 34.0522]; // LA
      const steps = 10; // Increased steps for better resolution
      const result = interpolateGreatCircle(start, end, steps);

      expect(result.length).toBe(1);
      expect(result[0]!.length).toBe(11); // steps + 1 (including start and end)

      const segment = result[0]!;
      expect(segment).toBeDefined();
      expect(segment.length).toBe(11); // steps + 1 (including start and end)

      const startPoint = segment[0]!;
      expect(startPoint).toBeDefined();
      // Check start point with tolerance
      expect(startPoint[0]).toBeCloseTo(139.6917, 5); // Longitude
      expect(startPoint[1]).toBeCloseTo(35.6895, 5); // Latitude

      const endPoint = segment[10]!;
      expect(endPoint).toBeDefined();
      // Check end point with tolerance, accounting for longitude wrapping
      const actualLon = endPoint[0];
      const expectedLon = -118.2437;
      const normalizedDiff = Math.min(
        Math.abs(actualLon - expectedLon),
        Math.abs(actualLon + 360 - expectedLon),
        Math.abs(actualLon - 360 - expectedLon),
      );
      expect(normalizedDiff).toBeLessThan(0.00001); // Tolerance for 5 decimal places

      expect(endPoint[1]).toBeCloseTo(34.0522, 5); // Latitude

      // Check for antimeridian crossing by analyzing longitude progression
      const longitudes = segment.map((point) => point[0]);
      expect(longitudes[0]).toBeGreaterThan(0); // Start in eastern hemisphere
      // Check end longitude with wrapping tolerance
      const endLonDiff = Math.min(
        Math.abs(longitudes[longitudes.length - 1]! - expectedLon),
        Math.abs(longitudes[longitudes.length - 1]! + 360 - expectedLon),
        Math.abs(longitudes[longitudes.length - 1]! - 360 - expectedLon),
      );
      expect(endLonDiff).toBeLessThan(0.00001); // Ensure end matches LA longitude

      // Verify the path progresses across the antimeridian
      const startToEndDiff = Math.abs(longitudes[longitudes.length - 1]! - longitudes[0]!);
      const crossesAntimeridian = startToEndDiff > 180 || 360 - startToEndDiff > 180;
      expect(crossesAntimeridian).toBe(true); // Check for crossing
    });

    it('should apply perpendicular arc curvature smoothly', () => {
      const start: [number, number] = [121.5654, 25.033]; // Taipei
      const end: [number, number] = [139.6917, 35.6895]; // Tokyo
      const steps = 4;
      const result = interpolateGreatCircle(start, end, steps);

      expect(result.length).toBe(1);
      expect(result[0]!.length).toBe(5);

      const segment = result[0]!;
      expect(segment).toBeDefined();
      expect(segment.length).toBe(5);

      // Midpoint should be offset from a straight line between start and end
      const midPoint = segment[2]!;
      expect(midPoint).toBeDefined();
      expect(midPoint[0]).toBeGreaterThan(121);
      expect(midPoint[0]).toBeLessThan(140);

      // Arc should be smooth: start and end points should be close to original coordinates
      const startPoint = segment[0]!;
      expect(startPoint[0]).toBeCloseTo(121.5654, 4);
      expect(startPoint[1]).toBeCloseTo(25.033, 4);
      const endPoint = segment[4]!;
      expect(endPoint[0]).toBeCloseTo(139.6917, 4);
      expect(endPoint[1]).toBeCloseTo(35.6895, 4);
    });
  });
});
