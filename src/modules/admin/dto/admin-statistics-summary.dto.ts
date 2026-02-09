import { ApiProperty } from '@nestjs/swagger';

export class BusinessByCategoryDto {
  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  count!: number;
}

export class StatisticsTotalsDto {
  @ApiProperty({ description: 'Total users (excluding deleted)' })
  users!: number;

  @ApiProperty({ description: 'Total active and pending businesses' })
  businesses!: number;

  @ApiProperty({ description: 'New users in last 30 days' })
  newUsers!: number;

  @ApiProperty({ description: 'Total reels' })
  reels!: number;
}

export class AdminStatisticsSummaryDto {
  @ApiProperty({ type: [BusinessByCategoryDto] })
  businessesByCategory!: BusinessByCategoryDto[];

  @ApiProperty()
  totals!: StatisticsTotalsDto;
}
