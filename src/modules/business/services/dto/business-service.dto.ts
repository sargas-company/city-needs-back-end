import { ApiProperty } from '@nestjs/swagger';
import { BusinessServiceStatus } from '@prisma/client';

export class BusinessServiceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  duration!: number;

  @ApiProperty()
  position!: number;

  @ApiProperty({ enum: BusinessServiceStatus })
  status!: BusinessServiceStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
