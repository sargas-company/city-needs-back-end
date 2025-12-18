// src/modules/auth/dto/auth-me-response.dto.ts
import { ResponseWrapperDto } from 'src/common/dto/response-wrapper.dto';

import { AuthMeDto } from './auth-me.dto';

export class AuthMeResponseDto extends ResponseWrapperDto<AuthMeDto> {}
