// src/modules/auth/auth.swagger.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiUnauthorizedResponse, ApiTags } from '@nestjs/swagger';

import { AuthMeSwaggerResponseDto } from './dto/auth-me-swagger-response.dto';
import { AuthSyncSwaggerResponseDto } from './dto/auth-sync-swagger-response.dto';

export function SwaggerAuthSync() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOkResponse({
      description: 'Syncs Firebase user with database and returns DB user',
      type: AuthSyncSwaggerResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or missing Firebase ID token',
    }),
  );
}

export function SwaggerAuthMe() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOkResponse({
      description: 'Returns current authenticated DB user',
      type: AuthMeSwaggerResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or missing Firebase ID token, or user not synced',
    }),
  );
}
