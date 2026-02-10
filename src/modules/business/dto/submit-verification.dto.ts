// src/modules/business/dto/submit-verification.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitVerificationDto {
  @ApiProperty({
    description: 'ID of the verification document file',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  verificationFileId!: string;
}

export class SubmitVerificationResponseDto {
  @ApiProperty({
    description: 'ID of the created verification',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  verificationId!: string;

  @ApiProperty({
    description: 'Status of the verification',
    example: 'PENDING',
  })
  status!: string;

  @ApiProperty({
    description: 'Message confirming the submission',
    example: 'Verification has been submitted successfully',
  })
  message!: string;
}
