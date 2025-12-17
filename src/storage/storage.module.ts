import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { S3StorageService } from './s3.storage.service';
import { S3_CLIENT } from './storage.constants';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const region = config.get<string>('S3_REGION');
        const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
        const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');

        if (!region) throw new Error('S3_REGION is missing');
        if (!accessKeyId) throw new Error('S3_ACCESS_KEY_ID is missing');
        if (!secretAccessKey) throw new Error('S3_SECRET_ACCESS_KEY is missing');

        return new S3Client({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });
      },
    },
    {
      provide: S3StorageService,
      inject: [ConfigService, S3_CLIENT],
      useFactory: (config: ConfigService, s3: S3Client) => new S3StorageService(config, s3),
    },
    {
      provide: StorageService,
      useExisting: S3StorageService,
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
