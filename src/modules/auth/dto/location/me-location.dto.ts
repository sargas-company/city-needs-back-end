import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationSource } from '@prisma/client';

export class MeLocationDto {
  @ApiProperty({ example: 43.6532 })
  lat!: number;

  @ApiProperty({ example: -79.3832 })
  lng!: number;

  @ApiProperty({ enum: LocationSource, example: LocationSource.gps })
  source!: LocationSource;

  @ApiPropertyOptional({ nullable: true, example: 'google' })
  provider!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'place-id-123' })
  placeId!: string | null;

  @ApiProperty({ example: new Date().toISOString() })
  updatedAt!: string;
}

export class MeLocationResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiPropertyOptional({ type: MeLocationDto, nullable: true })
  location!: MeLocationDto | null;
}
