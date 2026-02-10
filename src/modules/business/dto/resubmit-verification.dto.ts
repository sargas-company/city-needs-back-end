// src/modules/business/dto/resubmit-verification.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResubmitVerificationDto {
  @ApiProperty({
    description: 'ID of the new verification document file',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  verificationFileId!: string;
}

export class ResubmitVerificationResponseDto {
  @ApiProperty({
    description: 'ID of the updated verification',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  verificationId!: string;

  @ApiProperty({
    description: 'New status of the verification',
    example: 'PENDING',
  })
  status!: string;

  @ApiProperty({
    description: 'Message confirming the resubmission',
    example: 'Verification has been resubmitted successfully',
  })
  message!: string;
}
