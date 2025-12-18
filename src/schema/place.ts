import { z } from 'zod';

export const PlaceSchema = z.object({
  displayName: z.string().min(1),
  formattedAddress: z.string().min(1),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export type Place = z.infer<typeof PlaceSchema>;
