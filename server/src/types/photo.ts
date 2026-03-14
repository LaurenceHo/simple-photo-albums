import { z } from 'zod';

export const PhotoSchema = z.object({
  url: z.string().min(1),
  key: z.string().min(1),
  size: z.number().optional(),
  lastModified: z.string().optional(),
});

export type Photo = z.infer<typeof PhotoSchema>;
