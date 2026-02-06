// src/modules/admin/dto/reject-verification.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectVerificationDto {
  @ApiProperty({
    description: 'Reason why verification was rejected',
    example: 'Document is blurry and unreadable',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rejectionReason!: string;
}
