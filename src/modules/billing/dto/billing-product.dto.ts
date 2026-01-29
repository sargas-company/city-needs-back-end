import { ApiProperty } from '@nestjs/swagger';

export class BillingProductDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string | null;
}
