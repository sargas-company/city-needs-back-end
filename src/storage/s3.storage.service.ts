// src/storage/s3.storage.service.ts
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { StorageService, StorageUploadInput, StorageUploadPublicResult } from './storage.service';

@Injectable()
export class S3StorageService extends StorageService {
  private readonly logger = new Logger(S3StorageService.name);

  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly s3: S3Client,
  ) {
    super();

    const bucket = this.config.get<string>('S3_BUCKET');
    const publicBaseUrl = this.config.get<string>('S3_PUBLIC_BASE_URL');

    if (!bucket) throw new Error('S3_BUCKET is missing');
    if (!publicBaseUrl) throw new Error('S3_PUBLIC_BASE_URL is missing');

    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');
  }

  async uploadPublic(input: StorageUploadInput): Promise<StorageUploadPublicResult> {
    this.assertValidKey(input.storageKey);
    if (!input.storageKey.startsWith('public/')) {
      throw new InternalServerErrorException(
        'uploadPublic must use storageKey starting with public/',
      );
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.storageKey,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: input.cacheControl ?? 'public, max-age=31536000, immutable',
        }),
      );

      const publicUrl = `${this.publicBaseUrl}/${encodeURI(input.storageKey)}`;

      const size = Buffer.isBuffer(input.body) ? input.body.length : 'stream';
      this.logger.log(
        `Uploaded public object: bucket=${this.bucket} key=${input.storageKey} size=${size}`,
      );

      return { storageKey: input.storageKey, publicUrl };
    } catch (err: any) {
      this.logger.error(
        `Failed to upload public object: bucket=${this.bucket} key=${input.storageKey}`,
        err?.stack ?? String(err),
      );
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async uploadPrivate(input: StorageUploadInput): Promise<{ storageKey: string }> {
    this.assertValidKey(input.storageKey);
    if (!input.storageKey.startsWith('private/')) {
      throw new InternalServerErrorException(
        'uploadPrivate must use storageKey starting with private/',
      );
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.storageKey,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: input.cacheControl ?? 'private, max-age=0, no-cache',
        }),
      );

      const size = Buffer.isBuffer(input.body) ? input.body.length : 'stream';
      this.logger.log(
        `Uploaded private object: bucket=${this.bucket} key=${input.storageKey} size=${size}`,
      );

      return { storageKey: input.storageKey };
    } catch (err: any) {
      this.logger.error(
        `Failed to upload private object: bucket=${this.bucket} key=${input.storageKey}`,
        err?.stack ?? String(err),
      );
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async getSignedDownloadUrl(storageKey: string, expiresInSeconds: number): Promise<string> {
    this.assertValidKey(storageKey);

    try {
      const url = await getSignedUrl(
        this.s3,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
        { expiresIn: expiresInSeconds },
      );

      return url;
    } catch (err: any) {
      this.logger.error(
        `Failed to sign download url: bucket=${this.bucket} key=${storageKey}`,
        err?.stack ?? String(err),
      );
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    this.assertValidKey(storageKey);

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );

      this.logger.log(`Deleted object: bucket=${this.bucket} key=${storageKey}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to delete object: bucket=${this.bucket} key=${storageKey}`,
        err?.stack ?? String(err),
      );
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async downloadToFile(storageKey: string, destPath: string): Promise<void> {
    this.assertValidKey(storageKey);

    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      const readable =
        response.Body instanceof Readable
          ? response.Body
          : Readable.from(response.Body as AsyncIterable<Uint8Array>);

      await pipeline(readable, createWriteStream(destPath));

      const stats = await fs.stat(destPath);
      if (stats.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      this.logger.log(`Downloaded object to file: key=${storageKey} dest=${destPath}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to download object: bucket=${this.bucket} key=${storageKey}`,
        err?.stack ?? String(err),
      );
      throw new InternalServerErrorException('Failed to download file');
    }
  }

  private assertValidKey(storageKey: string) {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new InternalServerErrorException('Invalid storageKey');
    }
    if (storageKey.startsWith('/')) {
      throw new InternalServerErrorException('storageKey must not start with "/"');
    }
    if (storageKey.includes('..')) {
      throw new InternalServerErrorException('storageKey must not contain ".."');
    }
  }
}
