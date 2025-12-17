export type StorageUploadInput = {
  storageKey: string;
  contentType: string;
  body: Buffer;
  cacheControl?: string;
};

export type StorageUploadPublicResult = {
  storageKey: string;
  publicUrl: string;
};

export abstract class StorageService {
  abstract uploadPublic(input: StorageUploadInput): Promise<StorageUploadPublicResult>;
  abstract deleteObject(storageKey: string): Promise<void>;
}
