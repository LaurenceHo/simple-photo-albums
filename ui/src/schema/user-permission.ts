import { z } from 'zod';

export const UserPermissionSchema = z.object({
  uid: z.string(),
  email: z.string(),
  role: z.string(),
  displayName: z.string(),
});

export type UserPermission = z.infer<typeof UserPermissionSchema>;
