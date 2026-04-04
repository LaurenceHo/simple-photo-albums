import { AlbumSchema } from '@/schema/album';
import { z } from 'zod';

export const AlbumsByYearSchema = z.array(
  z.object({
    year: z.string(),
    count: z.number(),
  }),
);

export const AggregateTypeSchema = z.enum([
  'albums-with-location',
  'count-albums-by-year',
  'featured-albums',
]);

const DataAggregateValueMapSchema = z.object({
  'albums-with-location': z.array(AlbumSchema),
  'count-albums-by-year': AlbumsByYearSchema,
  'featured-albums': z.array(AlbumSchema),
});

export type AggregateType = z.infer<typeof AggregateTypeSchema>;
export type AlbumsByYear = z.infer<typeof AlbumsByYearSchema>[];
export type DataAggregateValueMap = z.infer<typeof DataAggregateValueMapSchema>;
