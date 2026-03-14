import { z } from 'zod';

export const PhotoSchema = z.object({
  url: z.string(),
  key: z.string(), // `${albumId}/${photoId}`
  size: z.number().optional(),
  lastModified: z.string().optional(),
});

export type Photo = z.infer<typeof PhotoSchema>;
