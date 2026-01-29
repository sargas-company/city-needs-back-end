import { ApiProperty } from '@nestjs/swagger';

import { BillingPriceDto } from './billing-price.dto';

export class BillingPricesResponseDto {
  @ApiProperty({ type: [BillingPriceDto] })
  items!: BillingPriceDto[];
}
