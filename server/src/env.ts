import { UserPermission } from './types/user-permission';

export interface Env {
  DB: D1Database;
  AWS_S3_BUCKET_NAME: string;
  AWS_REGION_NAME: string;
  VITE_IMAGEKIT_CDN_URL: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  JWT_SECRET?: string;
  GOOGLE_PLACES_API_KEY?: string;
  VITE_GOOGLE_CLIENT_ID?: string;
  ALBUM_URL?: string;
  RAPIDAPI_KEY?: string;
  ENVIRONMENT?: string;
  DEVELOPMENT?: string;
}

export type Bindings = {
  DB: D1Database;
  AWS_S3_BUCKET_NAME: string;
  AWS_REGION_NAME: string;
  VITE_IMAGEKIT_CDN_URL: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  JWT_SECRET: string;
  GOOGLE_PLACES_API_KEY: string;
  VITE_GOOGLE_CLIENT_ID: string;
  ALBUM_URL: string;
  RAPIDAPI_KEY: string;
  ENVIRONMENT: string;
  DEVELOPMENT: string;
};

export type HonoEnv = {
  Bindings: Bindings;
  Variables: {
    user?: UserPermission;
  };
};
