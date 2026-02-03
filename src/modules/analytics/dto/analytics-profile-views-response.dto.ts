// src/modules/analytics/dto/analytics-profile-views-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsSource } from '@prisma/client';

export class TimelineItemDto {
  @ApiProperty({
    description: 'Short month name',
    example: 'Jan',
  })
  label!: string;

  @ApiProperty({
    description: 'Profile views count for the month',
    example: 150,
  })
  value!: number;
}

export class SourceDistributionDto {
  @ApiProperty({
    enum: AnalyticsSource,
    description: 'Source of the view',
    example: AnalyticsSource.SEARCH,
  })
  source!: AnalyticsSource;

  @ApiProperty({
    description: 'Percentage of views from this source (rounded to integer)',
    example: 45,
  })
  percent!: number;
}

export class AnalyticsProfileViewsResponseDto {
  @ApiProperty({
    description: 'Total profile views for current month',
    example: 150,
  })
  total!: number;

  @ApiProperty({
    description: 'Percentage change compared to previous month',
    example: 25.5,
  })
  deltaPercent!: number;

  @ApiProperty({
    description: 'Profile views timeline for last 6 months',
    type: [TimelineItemDto],
  })
  timeline!: TimelineItemDto[];

  @ApiProperty({
    description: 'Distribution of views by source for current month',
    type: [SourceDistributionDto],
  })
  sources!: SourceDistributionDto[];
}
