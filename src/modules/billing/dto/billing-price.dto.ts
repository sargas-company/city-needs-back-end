import { ApiProperty } from '@nestjs/swagger';

export class BillingPriceDto {
  @ApiProperty()
  stripePriceId!: string;

  @ApiProperty({ required: false })
  nickname?: string | null;

  @ApiProperty({ example: 8400 })
  amount!: number;

  @ApiProperty({ example: 'CAD' })
  currency!: string;

  @ApiProperty({ example: 'month' })
  interval!: string;

  @ApiProperty({ example: 1 })
  intervalCount!: number;
}
