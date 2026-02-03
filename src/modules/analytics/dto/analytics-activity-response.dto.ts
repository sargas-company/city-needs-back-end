// src/modules/analytics/dto/analytics-activity-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ActivityMonthDto {
  @ApiProperty({
    description: 'Short month name',
    example: 'Jan',
  })
  label!: string;

  @ApiProperty({
    description: 'Profile views count for the month',
    example: 150,
  })
  views!: number;

  @ApiProperty({
    description: 'User actions count for the month',
    example: 45,
  })
  actions!: number;
}

export class AnalyticsActivityResponseDto {
  @ApiProperty({
    description: 'Monthly activity data for the last 6 months',
    type: [ActivityMonthDto],
  })
  data!: ActivityMonthDto[];
}
