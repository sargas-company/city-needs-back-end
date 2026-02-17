import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectBusinessVideoDto {
  @ApiProperty({ example: 'Video contains prohibited content' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  rejectionReason!: string;
}
