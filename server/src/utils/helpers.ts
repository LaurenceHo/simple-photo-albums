import { DeleteObjectsCommandInput, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { verifyJwt } from './jwt';
import { get } from 'radash';
import { Bindings, HonoEnv } from '../env';
import R2Service, { R2Config } from '../services/r2-service';

/** Build R2Config from Hono environment bindings. */
export const buildR2Config = (env: Bindings): R2Config => ({
  accountId: env.CLOUDFLARE_ACCOUNT_ID,
  accessKey: env.R2_ACCESS_KEY,
  secretKey: env.R2_SECRET_KEY,
  region: env.REGION_NAME,
  cdnUrl: env.VITE_IMAGEKIT_CDN_URL,
});

export const uploadObject = async (r2Config: R2Config, bucketName: string, filePath: string, object: any) => {
  console.log(`##### R2 destination file path: ${filePath}`);
  const r2Service = new R2Service(r2Config);

  try {
    const putObject: PutObjectCommandInput = {
      Body: object ?? '',
      Bucket: bucketName,
      Key: filePath,
    };

    return await r2Service.create(putObject);
  } catch (err) {
    console.error(`Failed to upload photo: ${err}`);
    throw new Error('Error when uploading photo', { cause: err });
  }
};

export const deleteObjects = async (
  r2Config: R2Config,
  bucketName: string,
  objectKeys: string[],
): Promise<boolean> => {
  const r2Service = new R2Service(r2Config);
  try {
    const keysToDelete = Array.isArray(objectKeys) ? objectKeys : [objectKeys];
    if (keysToDelete.length === 0) return true;

    const deleteParams: DeleteObjectsCommandInput = {
      Bucket: bucketName,
      Delete: { Objects: keysToDelete.map((key) => ({ Key: key })) },
    };

    return await r2Service.delete(deleteParams);
  } catch (err: any) {
    console.error('Failed to delete objects: %s', err);
    return false;
  }
};

export const emptyR2Folder = async (
  r2Config: R2Config,
  bucketName: string,
  folderName: string,
): Promise<boolean> => {
  const r2Service = new R2Service(r2Config);

  const emptyFolder = async (currentFolderName: string): Promise<boolean> => {
    const prefix = currentFolderName.endsWith('/') ? currentFolderName : `${currentFolderName}/`;
    const listedObjects = await r2Service.listObjects({
      Bucket: bucketName,
      Prefix: prefix,
    });

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) return true;

    const listedObjectArray = listedObjects.Contents.map(({ Key }: any) => Key).filter(
      (key): key is string => !!key,
    );
    const deleteResult = await deleteObjects(r2Config, bucketName, listedObjectArray);
    if (!deleteResult) return false;

    if (listedObjects.IsTruncated) {
      return await emptyFolder(currentFolderName);
    }

    return true;
  };

  try {
    return await emptyFolder(folderName);
  } catch (err) {
    console.error(`Failed to empty R2 folder: ${err}`);
    return false;
  }
};

export const verifyIfIsAdmin = async (c: Context<HonoEnv>) => {
  let isAdmin = false;
  const token = getCookie(c, 'jwt');

  if (token) {
    try {
      const decodedPayload = await verifyJwt(token, c.env.JWT_SECRET);
      isAdmin = get(decodedPayload, 'role') === 'admin';
    } catch (error) {
      console.error('JWT verification failed in verifyIfIsAdmin:', error);
      setCookie(c, 'jwt', '', { maxAge: 0, path: '/' });
    }
  }
  return isAdmin;
};

/**
 * Calculate distance between two points in kilometers
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const inputs = [lat1, lon1, lat2, lon2];

  // Only throw for non-number types (string, null, undefined, object)
  for (const input of inputs) {
    if (typeof input !== 'number') {
      throw new TypeError('All inputs must be numbers');
    }
  }

  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in km
};

export const isValidCoordination = (lat: number, lon: number): boolean => {
  return typeof lat === 'number' && typeof lon === 'number' && !Number.isNaN(lat) && !Number.isNaN(lon);
};
