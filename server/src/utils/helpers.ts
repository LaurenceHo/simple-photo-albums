import { DeleteObjectsCommandInput, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { verifyJwt } from './jwt';
import { get } from 'radash';
import { HonoEnv } from '../env';
import R2Service from '../services/r2-service';

const s3BucketName = process.env['R2_BUCKET_NAME'];

//https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-example-photo-album-full.html
export const uploadObject = async (filePath: string, object: any) => {
  console.log(`##### S3 destination file path: ${filePath}`);
  const r2Service = new R2Service();

  try {
    const putObject: PutObjectCommandInput = {
      Body: object ?? '',
      Bucket: s3BucketName,
      Key: filePath,
    };

    return await r2Service.create(putObject);
  } catch (err) {
    console.error(`Failed to upload photo: ${err}`);
    throw new Error('Error when uploading photo', { cause: err });
  }
};

export const deleteObjects = async (objectKeys: string[]) => {
  const deleteParams: DeleteObjectsCommandInput = {
    Bucket: s3BucketName,
    Delete: { Objects: [] },
  };

  objectKeys.forEach((objectKeys) => deleteParams.Delete?.Objects?.push({ Key: objectKeys }));
  const r2Service = new R2Service();

  try {
    return await r2Service.delete(deleteParams);
  } catch (err) {
    console.error(`Failed to delete photos: ${err}`);
    throw new Error('Error when deleting photos', { cause: err });
  }
};

export const emptyS3Folder = async (folderName: string) => {
  const r2Service = new R2Service();
  const listedObjects = await r2Service.listObjects({
    Bucket: s3BucketName,
    Prefix: folderName,
  });

  if (!listedObjects.Contents || listedObjects.Contents?.length === 0) return true;

  if (listedObjects.IsTruncated) {
    await emptyS3Folder(folderName);
  }

  const listedObjectArray = listedObjects.Contents.map(({ Key }: any) => Key);

  try {
    return await deleteObjects(listedObjectArray);
  } catch (err) {
    console.error(`Failed to empty S3 folder: ${err}`);
    throw new Error('Error when emptying S3 folder', { cause: err });
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
