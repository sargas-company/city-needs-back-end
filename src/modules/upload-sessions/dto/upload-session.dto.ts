import { ApiProperty } from '@nestjs/swagger';
import { UploadSessionStatus, UploadItemKind, FileType } from '@prisma/client';

export class UploadSessionFileDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: FileType }) type!: FileType;
  @ApiProperty() url!: string;
  @ApiProperty({ nullable: true }) storageKey!: string | null;
  @ApiProperty({ nullable: true }) originalName!: string | null;
  @ApiProperty({ nullable: true }) mimeType!: string | null;
  @ApiProperty({ nullable: true }) sizeBytes!: number | null;
  @ApiProperty({ enum: UploadItemKind }) kind!: UploadItemKind;
}

export class UploadSessionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: UploadSessionStatus }) status!: UploadSessionStatus;

  @ApiProperty() logoCount!: number;
  @ApiProperty() photosCount!: number;
  @ApiProperty() documentsCount!: number;
  @ApiProperty() totalCount!: number;

  @ApiProperty({ type: [UploadSessionFileDto] })
  files!: UploadSessionFileDto[];
}
