// src/modules/analytics/dto/analytics-user-actions-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsActionType } from '@prisma/client';

export class TimelineItemDto {
  @ApiProperty({
    description: 'Short month name',
    example: 'Jan',
  })
  label!: string;

  @ApiProperty({
    description: 'User actions count for the month',
    example: 45,
  })
  value!: number;
}

export class InteractionDistributionDto {
  @ApiProperty({
    enum: AnalyticsActionType,
    description: 'Type of interaction',
    example: AnalyticsActionType.CALL,
  })
  type!: AnalyticsActionType;

  @ApiProperty({
    description: 'Percentage of actions of this type (rounded to integer)',
    example: 35,
  })
  percent!: number;
}

export class AnalyticsUserActionsResponseDto {
  @ApiProperty({
    description: 'Total user actions for current month',
    example: 45,
  })
  total!: number;

  @ApiProperty({
    description: 'Percentage change compared to previous month',
    example: -10.2,
  })
  deltaPercent!: number;

  @ApiProperty({
    description: 'User actions timeline for last 6 months',
    type: [TimelineItemDto],
  })
  timeline!: TimelineItemDto[];

  @ApiProperty({
    description: 'Distribution of actions by type for current month',
    type: [InteractionDistributionDto],
  })
  interactions!: InteractionDistributionDto[];
}
