import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateBusinessHoursDto {
  @ApiProperty({
    description: 'ISO weekday: 1=Monday ... 7=Sunday',
    example: 1,
    minimum: 1,
    maximum: 7,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  weekday!: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is24h?: boolean;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_REGEX)
  startTime?: string | null;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_24H_REGEX)
  endTime?: string | null;
}
