import { z } from 'zod';
import { PlaceSchema } from './place';

export const TravelRecordSchema = z.object({
  id: z.string().optional(),
  travelDate: z.string(),
  departure: PlaceSchema.optional(),
  destination: PlaceSchema.optional(),
  transportType: z.enum(['flight', 'bus', 'train']),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  distance: z.number().optional(),
  aircraftType: z.string().optional(),
  durationMinutes: z.number().optional(),
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});

export type TravelRecord = z.infer<typeof TravelRecordSchema>;
