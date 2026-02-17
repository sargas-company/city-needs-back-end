import { ApiProperty } from '@nestjs/swagger';
import {
  BusinessStatus,
  BusinessVideoVerificationStatus,
  FileType,
  VideoProcessingStatus,
} from '@prisma/client';

import { MeLocationDto } from './location/me-location.dto';
import { UserDto } from './user.dto';

export enum BusinessVerificationNextAction {
  NONE = 'NONE',
  GO_TO_VERIFICATION = 'GO_TO_VERIFICATION',
  // WAIT_REVIEW = 'WAIT_REVIEW',
  // RESUBMIT = 'RESUBMIT',
}

export enum BillingSubscriptionStatus {
  INCOMPLETE = 'INCOMPLETE',
  INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED',
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  UNPAID = 'UNPAID',
  CANCELED = 'CANCELED',
}

export class CategoryPublicDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;
}

export class AddressDto {
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

  @ApiProperty({ nullable: true })
  addressLine2!: string | null;

  @ApiProperty({ nullable: true })
  zip!: string | null;
}

export class FileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ enum: FileType })
  type!: FileType;

  @ApiProperty({ nullable: true })
  mimeType!: string | null;

  @ApiProperty({ nullable: true })
  sizeBytes!: number | null;

  @ApiProperty({ nullable: true })
  originalName!: string | null;
}

export class BusinessVideoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: VideoProcessingStatus })
  processingStatus!: VideoProcessingStatus;

  @ApiProperty({ nullable: true })
  processedUrl!: string | null;

  @ApiProperty({ nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ nullable: true })
  durationSeconds!: number | null;

  @ApiProperty({ nullable: true })
  width!: number | null;

  @ApiProperty({ nullable: true })
  height!: number | null;

  @ApiProperty({ enum: BusinessVideoVerificationStatus })
  status!: BusinessVideoVerificationStatus;
}

export class BusinessDto {
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

  @ApiProperty({ enum: BusinessStatus })
  status!: BusinessStatus;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty({ type: CategoryPublicDto, nullable: true })
  category!: CategoryPublicDto | null;

  @ApiProperty({ nullable: true })
  addressId!: string | null;

  @ApiProperty({ type: AddressDto, nullable: true })
  address!: AddressDto | null;

  @ApiProperty({ type: MeLocationDto, nullable: true })
  location!: MeLocationDto | null;

  @ApiProperty({ nullable: true })
  logoId!: string | null;

  @ApiProperty({ type: FileDto, nullable: true })
  logo!: FileDto | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  verificationGraceDeadlineAt!: Date | null;

  @ApiProperty({ type: () => BusinessVideoDto, nullable: true })
  video!: BusinessVideoDto | null;
}

export class BusinessVerificationGateDto {
  @ApiProperty()
  requiresVerification!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  graceDeadlineAt!: Date | null;

  @ApiProperty()
  graceExpired!: boolean;

  @ApiProperty({ enum: BusinessStatus })
  status!: BusinessStatus;

  @ApiProperty()
  canUseApp!: boolean;

  @ApiProperty({ enum: BusinessVerificationNextAction })
  nextAction!: BusinessVerificationNextAction;
}

export class BillingPricePublicDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  interval!: string;

  @ApiProperty()
  intervalCount!: number;
}

export class BillingSubscriptionPublicDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: BillingSubscriptionStatus })
  status!: BillingSubscriptionStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  currentPeriodStartAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  currentPeriodEndAt!: Date;

  @ApiProperty()
  cancelAtPeriodEnd!: boolean;

  @ApiProperty({ type: BillingPricePublicDto })
  price!: BillingPricePublicDto;
}

export class AuthMeDto {
  @ApiProperty({ type: UserDto })
  user!: UserDto;

  @ApiProperty({ type: BusinessDto, nullable: true })
  business!: BusinessDto | null;

  @ApiProperty({ type: BusinessVerificationGateDto, nullable: true })
  verification!: BusinessVerificationGateDto | null;

  @ApiProperty({ type: MeLocationDto, nullable: true })
  location!: MeLocationDto | null;

  @ApiProperty({
    type: BillingSubscriptionPublicDto,
    nullable: true,
    required: false,
  })
  billingSubscription?: BillingSubscriptionPublicDto | null;
}
