import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';

export class ActivateBusinessResponseDto {
  @ApiProperty()
  businessId!: string;

  @ApiProperty({ enum: BusinessStatus })
  status!: BusinessStatus;
}
