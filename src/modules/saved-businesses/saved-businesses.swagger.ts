import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { SavedBusinessesListSwaggerResponseDto } from './dto/saved-businesses-swagger-response.dto';

export function SwaggerAddSavedBusiness() {
  return applyDecorators(
    ApiTags('Saved Businesses'),
    ApiBearerAuth(),
    ApiParam({
      name: 'businessId',
      description: 'Business ID to add to saved',
      example: 'uuid',
    }),
    ApiOkResponse({
      description: 'Business added to saved',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
    ApiForbiddenResponse({
      description: 'Cannot add your own business to saved',
    }),
    ApiNotFoundResponse({
      description: 'Business not found',
    }),
  );
}

export function SwaggerRemoveSavedBusiness() {
  return applyDecorators(
    ApiTags('Saved Businesses'),
    ApiBearerAuth(),
    ApiParam({
      name: 'businessId',
      description: 'Business ID to remove from saved',
      example: 'uuid',
    }),
    ApiOkResponse({
      description: 'Business removed from saved',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}

export function SwaggerListSavedBusinesses() {
  return applyDecorators(
    ApiTags('Saved Businesses'),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'List of saved businesses',
      type: SavedBusinessesListSwaggerResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
