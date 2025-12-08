import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class AwsS3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBaseUrl?: string;
  private readonly usePublicReadAcl: boolean;
  private readonly logger = new Logger(AwsS3Service.name);

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET!;
    if (!this.bucket) throw new Error('AWS_S3_BUCKET env var is required');

    this.publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
    this.usePublicReadAcl = /^true$/i.test(process.env.S3_OBJECT_PUBLIC_READ ?? '');

    this.s3 = new S3Client({ region: this.region });
  }

  publicUrlForKey(key: string): string {
    const safeKey = encodeURI(key);
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${safeKey}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${safeKey}`;
  }

  keyFromUrl(url: string): string {
    if (this.publicBaseUrl && url.startsWith(this.publicBaseUrl)) {
      const base = this.publicBaseUrl.replace(/\/+$/, '') + '/';
      return decodeURI(url.slice(base.length));
    }
    const s3Base = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;
    if (url.startsWith(s3Base)) return decodeURI(url.slice(s3Base.length));
    throw new BadRequestException('URL is not from the configured bucket/base URL');
  }

  async uploadBufferToKey(params: {
    key: string;
    contentType: string;
    body: Buffer | Uint8Array;
    cacheControl?: string;
  }): Promise<{ key: string; url: string }> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
          CacheControl: params.cacheControl ?? 'public, max-age=31536000, immutable',
          ...(this.usePublicReadAcl ? { ACL: 'public-read' as const } : {}),
        }),
      );
      return { key: params.key, url: this.publicUrlForKey(params.key) };
    } catch (e) {
      this.logger.error('uploadBufferToKey failed', {
        error: e as any,
        method: 'uploadBufferToKey',
        service: 'awsS3',
        params,
      });
      throw new InternalServerErrorException('Failed to upload to S3');
    }
  }

  async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const res = await this.s3.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      (res.Contents ?? []).forEach((o) => o.Key && keys.push(o.Key));
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return keys;
  }

  async listUrls(prefix: string): Promise<string[]> {
    const keys = await this.listKeys(prefix);
    return keys.map((k) => this.publicUrlForKey(k));
  }

  async moveObject(sourceKey: string, destKey: string): Promise<void> {
    await this.s3.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `/${this.bucket}/${sourceKey}`,
        Key: destKey,
        ...(this.usePublicReadAcl ? { ACL: 'public-read' as const } : {}),
      }),
    );
    await this.deleteKey(sourceKey);
  }

  async deleteKey(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  makeTmpFilename(prompt: string, contentType: string): string {
    const safePrompt = prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const ext = this.contentTypeToExt(contentType) || '.png';
    return `${safePrompt || 'image'}-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  }

  contentTypeToExt(contentType: string): string {
    const map: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/avif': '.avif',
      'image/svg+xml': '.svg',
      'video/webm': '.webm',
      'video/mp4': '.mp4',
    };
    return map[contentType] || '';
  }

  ensureExt(filename: string, fallback = '.png'): string {
    const ext = extname(filename);
    return ext ? filename : `${filename}${fallback}`;
  }
}
