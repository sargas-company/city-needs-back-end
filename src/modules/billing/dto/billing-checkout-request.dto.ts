import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class BillingCheckoutRequestDto {
  @ApiProperty({
    example: 'price_1QabcXYZ',
    description: 'Stripe price ID',
  })
  @IsString()
  priceId!: string;
}
