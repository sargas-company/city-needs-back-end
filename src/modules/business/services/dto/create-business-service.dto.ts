import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBusinessServiceDto {
  @ApiProperty({
    example: 'Haircut',
    description: 'Service name',
    maxLength: 128,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @ApiProperty({
    example: 3000,
    description: 'Service price in smallest currency unit (e.g. cents)',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  price!: number;

  @ApiProperty({
    example: 60,
    description: 'Service duration in minutes',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  duration!: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Manual position in services list',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
