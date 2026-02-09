import { ApiProperty } from '@nestjs/swagger';
import { BusinessVerificationStatus } from '@prisma/client';

import {
  AdminVerificationBusinessDetailDto,
  AdminVerificationFileDto,
} from './admin-verification-list-item.dto';

export class AdminVerificationDetailDto {
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

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: AdminVerificationFileDto, nullable: true })
  verificationFile!: AdminVerificationFileDto | null;

  @ApiProperty()
  business!: AdminVerificationBusinessDetailDto;
}
