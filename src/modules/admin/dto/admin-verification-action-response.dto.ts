// src/modules/admin/dto/admin-verification-action-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus, BusinessVerificationStatus } from '@prisma/client';

export class AdminVerificationActionResponseDto {
  @ApiProperty({
    description: 'Verification ID',
  })
  verificationId!: string;

  @ApiProperty({
    enum: BusinessVerificationStatus,
    description: 'Final verification status',
  })
  verificationStatus!: BusinessVerificationStatus;

  @ApiProperty({
    description: 'Business ID',
  })
  businessId!: string;

  @ApiProperty({
    enum: BusinessStatus,
    description: 'Final business status after verification action',
  })
  businessStatus!: BusinessStatus;
}
