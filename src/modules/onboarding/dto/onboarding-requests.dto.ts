import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { OnboardingAction } from '../types/onboarding.types';

// payload DTOs

export class AddressPayloadDto {
  @ApiProperty({ example: 'CA' })
  countryCode!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  addressLine1!: string;

  @ApiPropertyOptional({ nullable: true })
  addressLine2?: string | null;

  @ApiPropertyOptional({ nullable: true })
  zip?: string | null;
}

export class CategoriesPayloadDto {
  @ApiProperty({ type: [String] })
  categoryIds!: string[];
}

export class BusinessProfilePayloadDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: [String] })
  categoryIds!: string[];
}

// dto per action

export class CustomerAddressRequestDto {
  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.CUSTOMER_ADDRESS })
  action!: OnboardingAction.CUSTOMER_ADDRESS;

  @ApiProperty({ type: AddressPayloadDto })
  payload!: AddressPayloadDto;
}

export class CustomerCategoriesRequestDto {
  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.CUSTOMER_CATEGORIES })
  action!: OnboardingAction.CUSTOMER_CATEGORIES;

  @ApiProperty({ type: CategoriesPayloadDto })
  payload!: CategoriesPayloadDto;
}

export class BusinessProfileRequestDto {
  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.BUSINESS_PROFILE })
  action!: OnboardingAction.BUSINESS_PROFILE;

  @ApiProperty({ type: BusinessProfilePayloadDto })
  payload!: BusinessProfilePayloadDto;
}

export class BusinessAddressRequestDto {
  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.BUSINESS_ADDRESS })
  action!: OnboardingAction.BUSINESS_ADDRESS;

  @ApiProperty({ type: AddressPayloadDto })
  payload!: AddressPayloadDto;
}

export class BusinessFilesRequestDto {
  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.BUSINESS_FILES })
  action!: OnboardingAction.BUSINESS_FILES;

  @ApiPropertyOptional({ default: {} })
  payload?: Record<string, never>;
}

