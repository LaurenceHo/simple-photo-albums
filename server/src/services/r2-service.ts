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
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { get } from 'radash';
import { BaseService, Photo } from '../types';

export interface R2Config {
  accountId: string;
  accessKey: string;
  secretKey: string;
  region?: string;
  cdnUrl?: string;
}

export default class R2Service implements BaseService<Photo> {
  public readonly r2Client: S3Client;
  public readonly cdnURL: string;

  constructor(config: R2Config) {
    this.r2Client = new S3Client({
      region: config.region || 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
    this.cdnURL = config.cdnUrl || '';
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

    return photos;
  }

  async read(params: GetObjectCommandInput): Promise<any> {
    const response = await this.r2Client.send(new GetObjectCommand(params));
    if (!response.Body) {
      throw new Error('No data found in the R2 object');
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

  async getPresignedUploadUrl(bucket: string, key: string, contentType: string, expiresIn = 60): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.r2Client, command, { expiresIn });
  }

  async checkIfFileExists(params: HeadObjectCommandInput): Promise<boolean> {
    try {
      const response = await this.r2Client.send(new HeadObjectCommand(params));
      return response.$metadata.httpStatusCode === 200;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async checkIfBucketExists(params: HeadBucketCommandInput): Promise<boolean> {
    try {
      const response = await this.r2Client.send(new HeadBucketCommand(params));
      return response.$metadata.httpStatusCode === 200;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}
