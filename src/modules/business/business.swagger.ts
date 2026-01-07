// src/modules/business/business.swagger.ts
import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation } from '@nestjs/swagger';

import { BusinessLogoDto } from './dto/business-logo.dto';
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
