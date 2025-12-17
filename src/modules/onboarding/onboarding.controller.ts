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
  AddressPayloadDto,
  CategoriesPayloadDto,
  BusinessProfilePayloadDto,
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
      '- BUSINESS_FILES_SKIP (abort upload session)\n\n' +
      'For BUSINESS_FILES you must upload files first via /onboarding/upload-session.',
    schema: {
      discriminator: { propertyName: 'action' },
      oneOf: [
        { $ref: getSchemaPath(CustomerAddressRequestDto) },
        { $ref: getSchemaPath(CustomerCategoriesRequestDto) },
        { $ref: getSchemaPath(BusinessProfileRequestDto) },
        { $ref: getSchemaPath(BusinessAddressRequestDto) },
        { $ref: getSchemaPath(BusinessFilesRequestDto) },
        { $ref: getSchemaPath(BusinessFilesSkipRequestDto) },
      ],
    },
  })
  async submit(@CurrentUser() user: User, @Body() dto: OnboardingSubmitDto) {
    const result = await this.onboardingService.submit(user, dto);
    return successResponse(result, 201);
  }
}
