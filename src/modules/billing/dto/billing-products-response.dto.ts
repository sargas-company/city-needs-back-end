import { ApiProperty } from '@nestjs/swagger';

import { BillingProductDto } from './billing-product.dto';

export class BillingProductsResponseDto {
  @ApiProperty({ type: [BillingProductDto] })
  items!: BillingProductDto[];
}
