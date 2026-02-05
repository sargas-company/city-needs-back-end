import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';

export class DeactivateBusinessResponseDto {
  @ApiProperty()
  businessId!: string;

  @ApiProperty({ enum: BusinessStatus })
  status!: BusinessStatus;
}
