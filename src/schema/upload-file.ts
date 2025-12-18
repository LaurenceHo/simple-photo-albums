import { z } from 'zod';
const fileValidation = z.union([
  z.literal('valid'),
  z.literal('invalid_format'),
  z.literal('invalid_size'),
]);

export const UploadFileSchema = z.object({
  id: z.string(),
  file: z.instanceof(File),
  url: z.string(),
  status: z.union([z.literal('loading'), z.boolean(), z.null()]),
  exists: z.boolean(),
  fileValidation: fileValidation,
});

export type UploadFile = z.infer<typeof UploadFileSchema>;
export type FileValidationStatus = z.infer<typeof fileValidation>;
