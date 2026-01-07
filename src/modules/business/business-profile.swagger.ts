// src/modules/business/business-profile.swagger.ts
import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';

import { BusinessProfileDto } from './dto/business-profile.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';

export function SwaggerUpdateMyBusinessProfile() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      description:
        'Partially updates the current user business profile. ' +
        'Only provided fields are updated. Business hours are fully replaced if provided.',
    }),
    ApiBody({
      type: UpdateBusinessProfileDto,
      required: true,
    }),
    ApiOkResponse({
      description: 'Updated business profile',
      type: BusinessProfileDto,
    }),
  );
}
