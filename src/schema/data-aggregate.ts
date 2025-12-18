import { AlbumSchema } from '@/schema/album';
import { z } from 'zod';

export const AlbumsByYearSchema = z.array(
  z.object({
    year: z.string(),
    count: z.number(),
  }),
);

export const AggregateTypeSchema = z.enum([
  'albumsWithLocation',
  'countAlbumsByYear',
  'featuredAlbums',
]);

const DataAggregateValueMapSchema = z.object({
  albumsWithLocation: z.array(AlbumSchema),
  countAlbumsByYear: AlbumsByYearSchema,
  featuredAlbums: z.array(AlbumSchema),
});

export type AggregateType = z.infer<typeof AggregateTypeSchema>;
export type AlbumsByYear = z.infer<typeof AlbumsByYearSchema>[];
export type DataAggregateValueMap = z.infer<typeof DataAggregateValueMapSchema>;
