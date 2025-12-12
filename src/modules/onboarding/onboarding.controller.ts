import { Body, Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { OnboardingSubmitDto } from './dto/onboarding-submit.dto';
import {
  BusinessAddressRequestDto,
  BusinessFilesSkipRequestDto,
  BusinessProfileRequestDto,
  CustomerAddressRequestDto,
  CustomerCategoriesRequestDto,
  BusinessFilesMultipartRequestDto,
} from './dto/onboarding-sumit-swagger.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@ApiExtraModels(
  CustomerAddressRequestDto,
  CustomerCategoriesRequestDto,
  BusinessProfileRequestDto,
  BusinessAddressRequestDto,
  BusinessFilesSkipRequestDto,
  BusinessFilesMultipartRequestDto,
)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('submit')
  @UseGuards(DbUserAuthGuard)
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    description:
      'Submit onboarding step.\n\n' +
      '**END_USER flow**:\n' +
      '- CUSTOMER_ADDRESS\n' +
      '- CUSTOMER_CATEGORIES\n\n' +
      '**BUSINESS_OWNER flow**:\n' +
      '- BUSINESS_PROFILE\n' +
      '- BUSINESS_ADDRESS\n' +
      '- BUSINESS_FILES or BUSINESS_FILES_SKIP\n\n' +
      'BUSINESS_FILES must be sent as multipart/form-data with file fields.',
    schema: {
      discriminator: { propertyName: 'action' },
      oneOf: [
        { $ref: getSchemaPath(CustomerAddressRequestDto) },
        { $ref: getSchemaPath(CustomerCategoriesRequestDto) },
        { $ref: getSchemaPath(BusinessProfileRequestDto) },
        { $ref: getSchemaPath(BusinessAddressRequestDto) },
        { $ref: getSchemaPath(BusinessFilesSkipRequestDto) },
        { $ref: getSchemaPath(BusinessFilesMultipartRequestDto) },
      ],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'photos', maxCount: 6 },
        { name: 'documents', maxCount: 6 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 15 * 1024 * 1024,
          files: 13,
        },
      },
    ),
  )
  async submit(
    @CurrentUser() user: User,
    @Body() dto: OnboardingSubmitDto,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      photos?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    const result = await this.onboardingService.submit(user, dto, files);
    return successResponse(result, 201);
  }
}
