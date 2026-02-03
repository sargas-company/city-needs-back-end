// src/modules/analytics/dto/analytics-summary-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MetricDto {
  @ApiProperty({
    description: 'Total count for current month',
    example: 150,
  })
  total!: number;

  @ApiProperty({
    description: 'Percentage change compared to previous month',
    example: 25.5,
  })
  deltaPercent!: number;
}

export class AnalyticsSummaryResponseDto {
  @ApiProperty({
    description: 'Profile views statistics',
    type: MetricDto,
  })
  profileViews!: MetricDto;

  @ApiProperty({
    description: 'User actions statistics',
    type: MetricDto,
  })
  userActions!: MetricDto;
}
