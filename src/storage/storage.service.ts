import { Readable } from 'stream';

export type StorageUploadInput = {
  storageKey: string;
  contentType: string;
  body: Buffer | Readable;
  cacheControl?: string;
};

export type StorageUploadPublicResult = {
  storageKey: string;
  publicUrl: string;
};

export type StorageUploadPrivateResult = {
  storageKey: string;
  url: string;
};

export abstract class StorageService {
  abstract uploadPublic(input: StorageUploadInput): Promise<StorageUploadPublicResult>;
  abstract uploadPrivate(input: StorageUploadInput): Promise<{ storageKey: string }>;
  abstract getSignedDownloadUrl(storageKey: string, expiresInSeconds: number): Promise<string>;
  abstract deleteObject(storageKey: string): Promise<void>;
  abstract downloadToFile(storageKey: string, destPath: string): Promise<void>;
}
