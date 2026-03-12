import {
  _Object,
  CopyObjectCommand,
  CopyObjectCommandInput,
  DeleteObjectsCommand,
  DeleteObjectsCommandInput,
  GetObjectCommand,
  GetObjectCommandInput,
  HeadBucketCommand,
  HeadBucketCommandInput,
  HeadObjectCommand,
  HeadObjectCommandInput,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { get } from 'radash';
import { BaseService, Photo } from '../types';

export default class R2Service implements BaseService<Photo> {
  public readonly r2Client: S3Client;
  public readonly cdnURL: string;

  constructor() {
    this.r2Client = new S3Client({
      region: process.env['REGION_NAME'] || 'auto',
      endpoint: `https://${process.env['CLOUDFLARE_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env['R2_ACCESS_KEY'] || '',
        secretAccessKey: process.env['R2_SECRET_KEY'] || '',
      },
    });
    this.cdnURL = process.env['VITE_IMAGEKIT_CDN_URL'] || '';
  }

  async findAll(params: ListObjectsV2CommandInput): Promise<Photo[]> {
    const response = await this.r2Client.send(new ListObjectsV2Command(params));
    const s3ObjectContents: _Object[] = get(response, 'Contents', []);

    // Compose photos array from s3ObjectContents
    const photos: Photo[] = s3ObjectContents.map((photo) => {
      let url = '';
      let key = '';
      let size = 0;
      let lastModified = new Date();
      if (photo?.Key) {
        url = `${this.cdnURL}/${encodeURI(photo.Key)}`;
        key = photo.Key;
        size = photo.Size ?? 0;
        lastModified = photo.LastModified ?? new Date();
      }
      return { url, key, size, lastModified };
    });

    return Promise.resolve(photos);
  }

  async read(params: GetObjectCommandInput): Promise<any> {
    const response = await this.r2Client.send(new GetObjectCommand(params));
    if (!response.Body) {
      throw new Error('No data found in the S3 object');
    }

    // Convert the response body (ReadableStream) to a string
    const bodyContents = await response.Body.transformToString();

    // Parse the string as JSON
    return JSON.parse(bodyContents);
  }

  async create(params: PutObjectCommandInput): Promise<boolean> {
    const response = await this.r2Client.send(new PutObjectCommand(params));
    return response.$metadata.httpStatusCode === 200;
  }

  async delete(params: DeleteObjectsCommandInput): Promise<boolean> {
    const response = await this.r2Client.send(new DeleteObjectsCommand(params));
    if (response.$metadata.httpStatusCode === 200) {
      const deletedKeys = response.Deleted?.map((deleted) => deleted.Key).join(',');
      console.log(`##### Delete objects: ${deletedKeys}`);
    }
    return response.$metadata.httpStatusCode === 200;
  }

  async copy(params: CopyObjectCommandInput): Promise<boolean> {
    const response = await this.r2Client.send(new CopyObjectCommand(params));
    return response.$metadata.httpStatusCode === 200;
  }

  async listObjects(params: ListObjectsV2CommandInput): Promise<ListObjectsV2CommandOutput> {
    return await this.r2Client.send(new ListObjectsV2Command(params));
  }

  async checkIfFileExists(params: HeadObjectCommandInput): Promise<boolean> {
    try {
      const response = await this.r2Client.send(new HeadObjectCommand(params));
      return response.$metadata.httpStatusCode === 200;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return false;
    }
  }

  async checkIfBucketExists(params: HeadBucketCommandInput): Promise<boolean> {
    try {
      const response = await this.r2Client.send(new HeadBucketCommand(params));
      return response.$metadata.httpStatusCode === 200;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return false;
    }
  }
}

export const r2Client = new R2Service();
