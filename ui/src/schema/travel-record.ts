import { PlaceSchema } from '@/schema/place';
import { z } from 'zod';

export const TravelRecordSchema = z.object({
  id: z.string().optional(),
  travelDate: z.string(),
  departure: PlaceSchema.optional(),
  destination: PlaceSchema.optional(),
  transportType: z.enum(['flight', 'bus', 'train']),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  aircraftType: z.string().optional(),
  durationMinutes: z.number().optional(),
  distance: z.number().optional(),
});

export type TravelRecord = z.infer<typeof TravelRecordSchema>;
