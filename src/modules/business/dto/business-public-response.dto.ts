import { ApiProperty } from '@nestjs/swagger';

export class BusinessPublicAddressDto {
  @ApiProperty()
  countryCode!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  addressLine1!: string;

  @ApiProperty({ required: false })
  addressLine2?: string | null;

  @ApiProperty({ required: false })
  zip?: string | null;
}

export class BusinessPublicCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;
}

export class BusinessPublicLogoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  type!: string;
}

export class BusinessPublicHourDto {
  @ApiProperty({ description: '0 (Sunday) – 6 (Saturday)' })
  weekday!: number;

  @ApiProperty({ required: false, nullable: true })
  startTime!: string | null;

  @ApiProperty({ required: false, nullable: true })
  endTime!: string | null;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty()
  is24h!: boolean;
}

export class BusinessPublicResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  serviceOnSite!: boolean;

  @ApiProperty()
  serviceInStudio!: boolean;

  @ApiProperty()
  ratingAvg!: number;

  @ApiProperty()
  ratingCount!: number;

  @ApiProperty()
  timeZone!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: BusinessPublicAddressDto, required: false, nullable: true })
  address!: BusinessPublicAddressDto | null;

  @ApiProperty({ type: BusinessPublicCategoryDto })
  category!: BusinessPublicCategoryDto;

  @ApiProperty({ type: BusinessPublicLogoDto, required: false, nullable: true })
  logo!: BusinessPublicLogoDto | null;

  @ApiProperty({ type: [BusinessPublicHourDto] })
  businessHours!: BusinessPublicHourDto[];
}
