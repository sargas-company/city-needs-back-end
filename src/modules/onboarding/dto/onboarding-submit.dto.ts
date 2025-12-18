// src/modules/onboarding/dto/onboarding-submit.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

import { OnboardingAction } from '../types/onboarding.types';

export class AddressPayloadDto {
  @ApiProperty({ example: 'CA' })
  @IsString()
  countryCode!: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty()
  @IsString()
  state!: string;

  @ApiProperty()
  @IsString()
  addressLine1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zip?: string;
}

export class CategoriesPayloadDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  categoryIds!: string[];
}

export class BusinessProfilePayloadDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  categoryId!: string;
}

export class BusinessVerificationSubmitPayloadDto {
  @ApiProperty({ description: 'File id returned from POST /onboarding/verification-file' })
  @IsString()
  verificationFileId!: string;
}

export class OnboardingSubmitDto {
  @ApiProperty({ enum: OnboardingAction })
  @IsEnum(OnboardingAction)
  action!: OnboardingAction;

  @ApiPropertyOptional({ description: 'JSON payload for the action' })
  @IsOptional()
  payload?: any;
}
