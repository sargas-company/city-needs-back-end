// src/modules/admin/dto/request-resubmission.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RequestResubmissionDto {
  @ApiProperty({
    description: 'Reason why resubmission is required',
    example: 'Document is expired. Please upload a current document dated within the last 90 days.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  resubmissionReason!: string;
}
