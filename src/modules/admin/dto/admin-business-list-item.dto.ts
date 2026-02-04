import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';

export class AdminBusinessOwnerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  username!: string | null;
}

export class AdminBusinessCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;
}

export class AdminBusinessAddressDto {
  @ApiProperty()
  countryCode!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  addressLine1!: string;

  @ApiProperty({ nullable: true })
  addressLine2!: string | null;

  @ApiProperty({ nullable: true })
  zip!: string | null;
}

export class AdminBusinessListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: BusinessStatus })
  status!: BusinessStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  category!: AdminBusinessCategoryDto;

  @ApiProperty({ nullable: true })
  address!: AdminBusinessAddressDto | null;

  @ApiProperty()
  owner!: AdminBusinessOwnerDto;
}
