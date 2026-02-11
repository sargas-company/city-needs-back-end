// src/modules/admin/dto/reject-reel.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectReelDto {
  @ApiProperty({
    description: 'Reason why reel was rejected',
    example: 'Video contains inappropriate content',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rejectionReason!: string;
}
