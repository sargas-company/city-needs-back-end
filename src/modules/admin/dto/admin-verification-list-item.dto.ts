import { ApiProperty } from '@nestjs/swagger';
import { BusinessVerificationStatus, FileType } from '@prisma/client';

export class AdminVerificationFileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ type: String, nullable: true })
  mimeType!: string | null;

  @ApiProperty({ type: String, nullable: true })
  originalName!: string | null;
}

export class AdminVerificationBusinessLogoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ enum: FileType })
  type!: FileType;
}

export class AdminVerificationBusinessOwnerDto {
  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty({ type: String, nullable: true })
  username!: string | null;
}

export class AdminVerificationBusinessCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  requiresVerification!: boolean;

  @ApiProperty({ type: Number, nullable: true })
  gracePeriodHours!: number | null;
}

export class AdminVerificationBusinessAddressDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  countryCode!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  addressLine1!: string;

  @ApiProperty({ type: String, nullable: true })
  addressLine2!: string | null;

  @ApiProperty({ type: String, nullable: true })
  zip!: string | null;
}

export class AdminVerificationBusinessFileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ enum: FileType })
  type!: FileType;

  @ApiProperty({ type: String, nullable: true })
  mimeType!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  sizeBytes!: number | null;

  @ApiProperty({ type: String, nullable: true })
  originalName!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class AdminVerificationBusinessDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: AdminVerificationBusinessLogoDto, nullable: true })
  logo!: AdminVerificationBusinessLogoDto | null;

  @ApiProperty()
  owner!: AdminVerificationBusinessOwnerDto;
}

export class AdminVerificationBusinessDetailDto extends AdminVerificationBusinessDto {
  @ApiProperty()
  category!: AdminVerificationBusinessCategoryDto;

  @ApiProperty({ type: AdminVerificationBusinessAddressDto, nullable: true })
  address!: AdminVerificationBusinessAddressDto | null;

  @ApiProperty({ type: [AdminVerificationBusinessFileDto] })
  files!: AdminVerificationBusinessFileDto[];
}

export class AdminVerificationListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: BusinessVerificationStatus })
  status!: BusinessVerificationStatus;

  @ApiProperty({ type: String, nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  rejectionReason!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: AdminVerificationFileDto, nullable: true })
  verificationFile!: AdminVerificationFileDto | null;

  @ApiProperty()
  business!: AdminVerificationBusinessDto;
}
