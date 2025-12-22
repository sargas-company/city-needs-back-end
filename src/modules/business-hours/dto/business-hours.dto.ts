import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessHourDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  weekday!: number;

  @ApiPropertyOptional({ example: '08:00', nullable: true })
  startTime!: string | null;

  @ApiPropertyOptional({ example: '17:00', nullable: true })
  endTime!: string | null;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty()
  is24h!: boolean;
}

export class BusinessHoursDayDto {
  @ApiProperty()
  weekday!: number;

  @ApiProperty({ type: [BusinessHourDto] })
  hours!: BusinessHourDto[];
}
