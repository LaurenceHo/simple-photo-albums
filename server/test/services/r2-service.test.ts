import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import R2Service, { R2Config } from '../../src/services/r2-service';

const r2Mock = mockClient(S3Client);

const testR2Config: R2Config = {
  accountId: 'test-account',
  accessKey: 'test-access-key',
  secretKey: 'test-secret-key',
  cdnUrl: '',
};

describe('R2Service', () => {
  let r2Service: R2Service;

  beforeEach(() => {
    r2Mock.reset();
    r2Service = new R2Service(testR2Config);
  });

  describe('findAll', () => {
    it('should return array of photos from S3 objects', async () => {
      const mockResponse = {
        Contents: [
          {
            Key: 'test-photo.jpg',
            Size: 1024,
            LastModified: new Date('2025-01-01'),
          },
        ],
      };

      r2Mock.on(ListObjectsV2Command).resolves(mockResponse);

      const result = await r2Service.findAll({ Bucket: 'test-bucket' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: 'test-photo.jpg',
        size: 1024,
        lastModified: new Date('2025-01-01').toISOString(),
        url: `${r2Service.cdnURL}/test-photo.jpg`,
      });
    });

    it('should handle empty response', async () => {
      r2Mock.on(ListObjectsV2Command).resolves({});

      const result = await r2Service.findAll({ Bucket: 'test-bucket' });

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should return true when file is uploaded successfully', async () => {
      r2Mock.on(PutObjectCommand).resolves({
        $metadata: { httpStatusCode: 200 },
      });

      const result = await r2Service.create({
        Bucket: 'test-bucket',
        Key: 'test-photo.jpg',
        Body: 'test-content',
      });

      expect(result).toBe(true);
    });

    it('should return false when upload fails', async () => {
      r2Mock.on(PutObjectCommand).resolves({
        $metadata: { httpStatusCode: 500 },
      });

      const result = await r2Service.create({
        Bucket: 'test-bucket',
        Key: 'test-photo.jpg',
        Body: 'test-content',
      });

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should return true when objects are deleted successfully', async () => {
      r2Mock.on(DeleteObjectsCommand).resolves({
        $metadata: { httpStatusCode: 200 },
        Deleted: [{ Key: 'test-photo.jpg' }],
      });

      const result = await r2Service.delete({
        Bucket: 'test-bucket',
        Delete: { Objects: [{ Key: 'test-photo.jpg' }] },
      });

      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      r2Mock.on(DeleteObjectsCommand).resolves({
        $metadata: { httpStatusCode: 500 },
      });

      const result = await r2Service.delete({
        Bucket: 'test-bucket',
        Delete: { Objects: [{ Key: 'test-photo.jpg' }] },
      });

      expect(result).toBe(false);
    });
  });

  describe('copy', () => {
    it('should return true when object is copied successfully', async () => {
      r2Mock.on(CopyObjectCommand).resolves({
        $metadata: { httpStatusCode: 200 },
      });

      const result = await r2Service.copy({
        Bucket: 'test-bucket',
        CopySource: 'source-bucket/test-photo.jpg',
        Key: 'test-photo-copy.jpg',
      });

      expect(result).toBe(true);
    });

    it('should return false when copy fails', async () => {
      r2Mock.on(CopyObjectCommand).resolves({
        $metadata: { httpStatusCode: 500 },
      });

      const result = await r2Service.copy({
        Bucket: 'test-bucket',
        CopySource: 'source-bucket/test-photo.jpg',
        Key: 'test-photo-copy.jpg',
      });

      expect(result).toBe(false);
    });
  });

  describe('checkIfFileExists', () => {
    it('should return true when file exists', async () => {
      r2Mock.on(HeadObjectCommand).resolves({
        $metadata: { httpStatusCode: 200 },
      });

      const result = await r2Service.checkIfFileExists({
        Bucket: 'test-bucket',
        Key: 'test-photo.jpg',
      });

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      r2Mock.on(HeadObjectCommand).rejects({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      });

      const result = await r2Service.checkIfFileExists({
        Bucket: 'test-bucket',
        Key: 'test-photo.jpg',
      });

      expect(result).toBe(false);
    });
  });

  describe('checkIfBucketExists', () => {
    it('should return true when bucket exists', async () => {
      r2Mock.on(HeadBucketCommand).resolves({
        $metadata: { httpStatusCode: 200 },
      });

      const result = await r2Service.checkIfBucketExists({
        Bucket: 'test-bucket',
      });

      expect(result).toBe(true);
    });

    it('should return false when bucket does not exist', async () => {
      r2Mock.on(HeadBucketCommand).rejects({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      });

      const result = await r2Service.checkIfBucketExists({
        Bucket: 'test-bucket',
      });

      expect(result).toBe(false);
    });
  });

  describe('listObjects', () => {
    it('should return ListObjectsV2CommandOutput when successful', async () => {
      const mockResponse = {
        Contents: [
          {
            Key: 'test-photo.jpg',
            Size: 1024,
            LastModified: new Date('2025-01-01'),
          },
        ],
      };

      r2Mock.on(ListObjectsV2Command).resolves(mockResponse);

      const result = await r2Service.listObjects({
        Bucket: 'test-bucket',
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('read', () => {
    it('should parse JSON body from R2 object', async () => {
      const jsonData = { key: 'value', count: 42 };
      r2Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify(jsonData)),
        } as any,
      });

      const result = await r2Service.read({ Bucket: 'test-bucket', Key: 'data.json' });

      expect(result).toEqual(jsonData);
    });

    it('should throw when Body is empty', async () => {
      r2Mock.on(GetObjectCommand).resolves({ Body: undefined });

      await expect(r2Service.read({ Bucket: 'test-bucket', Key: 'missing.json' })).rejects.toThrow(
        'No data found in the R2 object',
      );
    });

    it('should throw when Body contains invalid JSON', async () => {
      r2Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToString: () => Promise.resolve('not-json'),
        } as any,
      });

      await expect(r2Service.read({ Bucket: 'test-bucket', Key: 'bad.json' })).rejects.toThrow();
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('should return a presigned URL string', async () => {
      const result = await r2Service.getPresignedUploadUrl(
        'test-bucket',
        'photos/test.jpg',
        'image/jpeg',
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('test-bucket');
    });

    it('should accept custom expiresIn', async () => {
      const result = await r2Service.getPresignedUploadUrl(
        'test-bucket',
        'photos/test.jpg',
        'image/png',
        300,
      );

      expect(typeof result).toBe('string');
    });
  });

  describe('checkIfFileExists - non-404 errors', () => {
    it('should re-throw non-NotFound errors', async () => {
      r2Mock.on(HeadObjectCommand).rejects({
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      });

      await expect(
        r2Service.checkIfFileExists({ Bucket: 'test-bucket', Key: 'forbidden.jpg' }),
      ).rejects.toMatchObject({ name: 'AccessDenied' });
    });
  });

  describe('checkIfBucketExists - non-404 errors', () => {
    it('should re-throw non-NotFound errors', async () => {
      r2Mock.on(HeadBucketCommand).rejects({
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      });

      await expect(
        r2Service.checkIfBucketExists({ Bucket: 'forbidden-bucket' }),
      ).rejects.toMatchObject({ name: 'AccessDenied' });
    });
  });
});
