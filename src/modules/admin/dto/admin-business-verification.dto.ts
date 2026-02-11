import { ApiProperty } from '@nestjs/swagger';
import { BusinessVerificationStatus } from '@prisma/client';

export class AdminBusinessVerificationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: BusinessVerificationStatus })
  status!: BusinessVerificationStatus;

  @ApiProperty({ type: String, nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  rejectionReason!: string | null;

  @ApiProperty({ type: String, nullable: true })
  resubmissionReason!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: String, nullable: true })
  reviewedByAdminId!: string | null;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      url: { type: 'string' },
      mimeType: { type: 'string', nullable: true },
      originalName: { type: 'string', nullable: true },
    },
  })
  verificationFile!: {
    id: string;
    url: string;
    mimeType: string | null;
    originalName: string | null;
  } | null;
}
