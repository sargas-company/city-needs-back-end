import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessCardDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  logoUrl!: string | null;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  category!: {
    id: string;
    title: string;
    slug: string;
  };

  @ApiProperty()
  ratingAvg!: number;

  @ApiProperty()
  ratingCount!: number;

  @ApiProperty()
  serviceOnSite!: boolean;

  @ApiProperty()
  serviceInStudio!: boolean;

  @ApiPropertyOptional()
  distanceMeters?: number;
}
