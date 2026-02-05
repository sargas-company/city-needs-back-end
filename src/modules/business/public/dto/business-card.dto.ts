import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessCardDto {
  @ApiProperty({ example: 'cee78984-4c94-402b-8df8-d1ba094a5d0a' })
  id!: string;

  @ApiProperty({ example: 'Luxury Spa & Wellness' })
  name!: string;

  @ApiProperty({ nullable: true, example: 'https://cdn.app/logo.png' })
  logoUrl!: string | null;

  @ApiProperty({ example: 550 })
  price!: number;

  @ApiProperty({ example: 'Saskatoon' })
  city!: string;

  @ApiProperty({ nullable: true, example: 52.129845 })
  lat!: number | null;

  @ApiProperty({ nullable: true, example: -106.680057 })
  lng!: number | null;

  @ApiProperty({
    example: {
      id: '31cdfb38-8d81-4ac1-a285-a72d9504dd71',
      title: 'Spa & Beauty',
      slug: 'spa-beauty',
    },
  })
  category!: {
    id: string;
    title: string;
    slug: string;
  };

  @ApiProperty({ example: 4.8 })
  ratingAvg!: number;

  @ApiProperty({ example: 125 })
  ratingCount!: number;

  @ApiProperty({ example: true })
  serviceOnSite!: boolean;

  @ApiProperty({ example: true })
  serviceInStudio!: boolean;

  @ApiPropertyOptional({ example: 1250 })
  distanceMeters?: number;

  @ApiProperty({
    example: false,
  })
  isSaved!: boolean;
}
