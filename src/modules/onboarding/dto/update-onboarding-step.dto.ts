import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateOnboardingStepDto {
  @ApiPropertyOptional({ example: 2, nullable: true, description: 'null => completed' })
  @IsOptional()
  @IsInt()
  @Min(1)
  step?: number | null;
}
