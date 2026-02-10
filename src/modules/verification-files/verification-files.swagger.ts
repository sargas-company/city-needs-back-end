import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import { GetCurrentVerificationFileResponseDto } from './dto/get-current-verification-file.response.dto';

export function SwaggerGetCurrentVerificationFile() {
  return applyDecorators(
    ApiOkResponse({
      description:
        'Returns current draft verification file (not attached to any verification). ' +
        'Returns null if no draft file exists.',
      type: GetCurrentVerificationFileResponseDto,
    }),
  );
}
