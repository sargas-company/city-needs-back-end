// src/modules/business/business.swagger.ts
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { BusinessLogoDto } from './dto/business-logo.dto';
import { BusinessPublicResponseDto } from './dto/business-public-response.dto';
import { UpdateBusinessLogoDto } from './dto/update-business-logo.dto';

export function SwaggerUpdateMyBusinessLogo() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      description:
        'Uploads and replaces the logo of the current user business. ' +
        'Previous logo (if exists) will be permanently deleted.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Business logo file',
      type: UpdateBusinessLogoDto,
    }),
    ApiOkResponse({
      description: 'Business logo updated',
      type: BusinessLogoDto,
    }),
  );
}

export function SwaggerGetBusinessById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get active business by id',
      description:
        'Returns public business profile by id. ' + 'Business must exist and have ACTIVE status.',
    }),
    ApiOkResponse({
      description: 'Active business profile',
      type: BusinessPublicResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Business not found or not active',
    }),
  );
}
