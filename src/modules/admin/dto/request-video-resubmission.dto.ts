import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RequestVideoResubmissionDto {
  @ApiProperty({ example: 'Please upload higher resolution video' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  resubmissionReason!: string;
}
