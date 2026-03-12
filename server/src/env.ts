import { UserPermission } from './types/user-permission';

export interface Env {
  DB: D1Database;
  REGION_NAME: string;
  VITE_IMAGEKIT_CDN_URL: string;
  R2_BUCKET_NAME: string;
  R2_ACCESS_KEY?: string;
  R2_SECRET_KEY?: string;
  JWT_SECRET?: string;
  GOOGLE_PLACES_API_KEY?: string;
  VITE_GOOGLE_CLIENT_ID?: string;
  ALBUM_URL?: string;
  RAPIDAPI_KEY?: string;
  ENVIRONMENT?: string;
  DEVELOPMENT?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
}

export type Bindings = {
  DB: D1Database;
  REGION_NAME: string;
  VITE_IMAGEKIT_CDN_URL: string;
  R2_BUCKET_NAME: string;
  R2_ACCESS_KEY: string;
  R2_SECRET_KEY: string;
  JWT_SECRET: string;
  GOOGLE_PLACES_API_KEY: string;
  VITE_GOOGLE_CLIENT_ID: string;
  ALBUM_URL: string;
  RAPIDAPI_KEY: string;
  ENVIRONMENT: string;
  DEVELOPMENT: string;
  CLOUDFLARE_ACCOUNT_ID: string;
};

export type HonoEnv = {
  Bindings: Bindings;
  Variables: {
    user?: UserPermission;
  };
};
