// src/modules/onboarding/dto/onboarding-sumit-swagger.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateBusinessHoursDto } from 'src/modules/business-hours/dto/update-business-hours.dto';

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

  @ApiProperty({ example: 'cat_id_1' })
  categoryId!: string;

  @ApiPropertyOptional({ type: [UpdateBusinessHoursDto] })
  businessHours?: UpdateBusinessHoursDto[];
}

export class BusinessVerificationSubmitPayloadDto {
  @ApiProperty({ example: 'file_uuid_here' })
  verificationFileId!: string;
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

export class BusinessFilesRequestDto {
  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.BUSINESS_FILES })
  action!: OnboardingAction.BUSINESS_FILES;

  @ApiPropertyOptional({
    description: 'Optional JSON string, usually empty',
    example: '{}',
  })
  payload?: Record<string, never>;
}

export class BusinessFilesSkipRequestDto {
  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.BUSINESS_FILES_SKIP })
  action!: OnboardingAction.BUSINESS_FILES_SKIP;

  @ApiPropertyOptional({
    description: 'Optional JSON string, usually empty',
    example: '{}',
  })
  payload?: Record<string, never>;
}

export class BusinessVerificationSubmitRequestDto {
  @ApiProperty({
    enum: OnboardingAction,
    example: OnboardingAction.BUSINESS_VERIFICATION_SUBMIT,
  })
  action!: OnboardingAction.BUSINESS_VERIFICATION_SUBMIT;

  @ApiProperty({ type: BusinessVerificationSubmitPayloadDto })
  payload!: BusinessVerificationSubmitPayloadDto;
}

export class BusinessVerificationSkipRequestDto {
  @ApiProperty({
    enum: OnboardingAction,
    example: OnboardingAction.BUSINESS_VERIFICATION_SKIP,
  })
  action!: OnboardingAction.BUSINESS_VERIFICATION_SKIP;

  @ApiPropertyOptional({
    description: 'Optional empty JSON',
    example: '{}',
  })
  payload?: Record<string, never>;
}
