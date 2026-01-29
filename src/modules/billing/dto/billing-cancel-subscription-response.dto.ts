import { ApiProperty } from '@nestjs/swagger';

export class BillingCancelSubscriptionResponseDto {
  @ApiProperty({
    example: 'CANCEL_AT_PERIOD_END',
  })
  status!: 'CANCEL_AT_PERIOD_END';

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-02-01T00:00:00.000Z',
  })
  currentPeriodEndAt!: Date;
}
