import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileType } from '@prisma/client';

export class CurrentVerificationFileDto {
  @ApiProperty({ example: 'uuid-file-id' })
  id!: string;

  @ApiProperty({ example: '/files/uuid-file-id/signed-url' })
  url!: string;

  @ApiProperty({ enum: FileType, example: FileType.BUSINESS_VERIFICATION_DOCUMENT })
  type!: FileType;

  @ApiPropertyOptional({ example: 'license.pdf', nullable: true })
  originalName!: string | null;

  @ApiPropertyOptional({ example: 'application/pdf', nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ example: 102400, nullable: true })
  sizeBytes!: number | null;

  @ApiProperty({ example: '2025-12-18T12:00:00.000Z' })
  createdAt!: Date;
}
