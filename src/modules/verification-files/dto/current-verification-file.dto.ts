import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessVerificationStatus, FileType } from '@prisma/client';

export class VerificationLockDto {
  @ApiProperty({ example: 'uuid-verification-id' })
  id!: string;

  @ApiProperty({ enum: BusinessVerificationStatus, example: BusinessVerificationStatus.PENDING })
  status!: BusinessVerificationStatus;

  @ApiPropertyOptional({ example: 'Document is not readable', nullable: true })
  rejectionReason!: string | null;

  @ApiPropertyOptional({ example: '2025-12-18T12:00:00.000Z', nullable: true })
  reviewedAt!: Date | null;
}

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

  @ApiPropertyOptional({ type: () => VerificationLockDto, nullable: true })
  lock!: VerificationLockDto | null;
}
