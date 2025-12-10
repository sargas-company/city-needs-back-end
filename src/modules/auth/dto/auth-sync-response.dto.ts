// src/modules/auth/dto/auth-sync-response.dto.ts
import { ResponseWrapperDto } from 'src/common/dto/response-wrapper.dto';

import { UserDto } from './user.dto';

export class AuthSyncResponseDto extends ResponseWrapperDto<UserDto> {}
