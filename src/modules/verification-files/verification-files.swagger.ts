import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import { GetCurrentVerificationFileResponseDto } from './dto/get-current-verification-file.response.dto';

export function SwaggerGetCurrentVerificationFile() {
  return applyDecorators(
    ApiOkResponse({
      description: 'Returns current verification file (or null if not uploaded).',
      type: GetCurrentVerificationFileResponseDto,
    }),
  );
}
