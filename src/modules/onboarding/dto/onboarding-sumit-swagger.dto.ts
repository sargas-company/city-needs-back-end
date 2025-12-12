import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { OnboardingAction } from '../types/onboarding.types';

// --------------------
// Payload DTOs (Swagger-only examples)
// --------------------

export class AddressPayloadDto {
  @ApiProperty({ example: 'CA' })
  countryCode!: string;

  @ApiProperty({ example: 'Toronto' })
  city!: string;

  @ApiProperty({ example: 'ON' })
  state!: string;

  @ApiProperty({ example: '123 Queen St W' })
  addressLine1!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Unit 12' })
  addressLine2?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'M5H 2M9' })
  zip?: string | null;
}

export class CategoriesPayloadDto {
  @ApiProperty({ type: [String], example: ['cat_id_1', 'cat_id_2'] })
  categoryIds!: string[];
}

export class BusinessProfilePayloadDto {
  @ApiProperty({ example: 'Best Coffee' })
  name!: string;

  @ApiProperty({ example: 'We sell the best coffee in town.' })
  description!: string;

  @ApiProperty({ example: '+14165551234' })
  phone!: string;

  @ApiProperty({ example: 'hello@bestcoffee.com' })
  email!: string;

  @ApiProperty({ type: [String], example: ['cat_id_1', 'cat_id_2'] })
  categoryIds!: string[];
}

// --------------------
// JSON request DTOs
// --------------------

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

export class BusinessFilesSkipRequestDto {
  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.BUSINESS_FILES_SKIP })
  action!: OnboardingAction.BUSINESS_FILES_SKIP;

  @ApiPropertyOptional({ default: {} })
  payload?: Record<string, never>;
}

// --------------------
// MULTIPART DTO
// --------------------

export class BusinessFilesMultipartRequestDto {
  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.BUSINESS_FILES })
  action!: OnboardingAction.BUSINESS_FILES;

  @ApiPropertyOptional({
    description: 'Optional JSON string, usually empty',
    example: '{}',
  })
  payload?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Business logo (max 1)',
  })
  logo?: any;

  @ApiPropertyOptional({
    type: 'array',
    description: 'Business photos (max 6)',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  photos?: any[];

  @ApiPropertyOptional({
    type: 'array',
    description: 'Business documents (max 6)',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  documents?: any[];
}
