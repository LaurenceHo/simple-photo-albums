import { PlaceSchema } from '@/schema/place';
import { z } from 'zod';

export const AlbumSchema = z.object({
  id: z.string().regex(/^[a-z0-9-_]*$/, {
    message: 'Only lowercase alphanumeric, underscore and dash are allowed',
  }),
  year: z.string(),
  albumName: z.string(),
  albumCover: z.string().optional(),
  description: z.string().optional(),
  isPrivate: z.boolean(),
  isFeatured: z.boolean().optional().nullable(),
  tags: z.array(z.string()).optional(),
  place: PlaceSchema.optional().nullable(),
});

export const AlbumTagSchema = z.object({
  tag: z.string(),
});

export type AlbumTag = z.infer<typeof AlbumTagSchema>;
export type Album = z.infer<typeof AlbumSchema>;
