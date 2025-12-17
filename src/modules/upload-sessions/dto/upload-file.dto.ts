import { ApiProperty } from '@nestjs/swagger';
import { UploadItemKind } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ enum: UploadItemKind })
  @IsEnum(UploadItemKind)
  kind!: UploadItemKind;
}
