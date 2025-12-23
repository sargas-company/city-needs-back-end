// src/modules/onboarding/onboarding.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';
import { UpdateBusinessHoursDto } from 'src/modules/business-hours/dto/update-business-hours.dto';

import { OnboardingSubmitDto } from './dto/onboarding-submit.dto';
import {
  AddressPayloadDto,
  CategoriesPayloadDto,
  BusinessProfilePayloadDto,
  BusinessAddressRequestDto,
  BusinessFilesRequestDto,
  BusinessFilesSkipRequestDto,
  BusinessProfileRequestDto,
  CustomerAddressRequestDto,
  CustomerCategoriesRequestDto,
  BusinessVerificationSubmitRequestDto,
  BusinessVerificationSubmitPayloadDto,
  BusinessVerificationSkipRequestDto,
} from './dto/onboarding-sumit-swagger.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@ApiExtraModels(
  CustomerAddressRequestDto,
  CustomerCategoriesRequestDto,
  BusinessProfileRequestDto,
  BusinessAddressRequestDto,
  BusinessFilesRequestDto,
  BusinessFilesSkipRequestDto,
  BusinessVerificationSubmitRequestDto,
  AddressPayloadDto,
  CategoriesPayloadDto,
  BusinessProfilePayloadDto,
  BusinessVerificationSubmitPayloadDto,
  BusinessVerificationSkipRequestDto,
  UpdateBusinessHoursDto,
)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('submit')
  @UseGuards(DbUserAuthGuard)
  @ApiConsumes('application/json')
  @ApiBody({
    description:
      'Submit onboarding step.\n\n' +
      '**END_USER flow**:\n' +
      '- CUSTOMER_ADDRESS\n' +
      '- CUSTOMER_CATEGORIES\n\n' +
      '**BUSINESS_OWNER flow**:\n' +
      '- BUSINESS_PROFILE\n' +
      '- BUSINESS_ADDRESS\n' +
      '- BUSINESS_FILES (commit upload session)\n' +
      '- BUSINESS_FILES_SKIP (abort upload session)\n' +
      '- BUSINESS_VERIFICATION_SUBMIT (step 4)\n' +
      '- BUSINESS_VERIFICATION_SKIP (step 4)\n\n' +
      'For BUSINESS_FILES you must upload files first via /onboarding/upload-session.\n' +
      'For BUSINESS_VERIFICATION_SUBMIT you must upload file first via /onboarding/verification-file.',
    schema: {
      discriminator: { propertyName: 'action' },
      oneOf: [
        { $ref: getSchemaPath(CustomerAddressRequestDto) },
        { $ref: getSchemaPath(CustomerCategoriesRequestDto) },
        { $ref: getSchemaPath(BusinessProfileRequestDto) },
        { $ref: getSchemaPath(BusinessAddressRequestDto) },
        { $ref: getSchemaPath(BusinessFilesRequestDto) },
        { $ref: getSchemaPath(BusinessFilesSkipRequestDto) },
        { $ref: getSchemaPath(BusinessVerificationSubmitRequestDto) },
        { $ref: getSchemaPath(BusinessVerificationSkipRequestDto) },
      ],
    },
  })
  async submit(@CurrentUser() user: User, @Body() dto: OnboardingSubmitDto) {
    const result = await this.onboardingService.submit(user, dto);
    return successResponse(result, 201);
  }
}
