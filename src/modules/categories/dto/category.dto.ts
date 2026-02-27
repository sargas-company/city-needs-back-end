import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true, description: 'S3 URL for category image' })
  imageUrl!: string | null;

  @ApiProperty({ nullable: true, description: 'Hex color for card background' })
  bgColor!: string | null;

  @ApiProperty()
  requiresVerification!: boolean;

  @ApiProperty({ nullable: true })
  gracePeriodHours!: number | null;
}
