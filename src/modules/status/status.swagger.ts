import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import { GetStatusDtoResponse } from './dto/get-status.dto';

export function SwaggerGetStatus() {
  return applyDecorators(
    ApiOkResponse({
      description: 'Returns the health and environment status of the API.',
      type: GetStatusDtoResponse,
    }),
  );
}
