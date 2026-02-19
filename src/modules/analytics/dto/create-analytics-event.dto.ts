import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsActionType, AnalyticsEventType, AnalyticsSource } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';

import { AnalyticsEventValidator } from '../validators/analytics-event.validator';

export class CreateAnalyticsEventDto {
  @ApiProperty({
    description: 'Business ID',
    example: 'business-uuid',
  })
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @ApiProperty({
    enum: AnalyticsEventType,
    description: 'Type of analytics event',
    example: AnalyticsEventType.PROFILE_VIEW,
  })
  @IsEnum(AnalyticsEventType)
  @Validate(AnalyticsEventValidator)
  type!: AnalyticsEventType;

  @ApiPropertyOptional({
    enum: AnalyticsSource,
    description: 'Required for PROFILE_VIEW, forbidden for USER_ACTION',
    example: AnalyticsSource.SEARCH,
  })
  @IsOptional()
  @IsEnum(AnalyticsSource)
  source?: AnalyticsSource;

  @ApiPropertyOptional({
    enum: AnalyticsActionType,
    description: 'Required for USER_ACTION, forbidden for PROFILE_VIEW',
    example: AnalyticsActionType.CALL,
  })
  @IsOptional()
  @IsEnum(AnalyticsActionType)
  actionType?: AnalyticsActionType;
}
