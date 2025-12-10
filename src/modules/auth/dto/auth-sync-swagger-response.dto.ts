// src/modules/auth/dto/auth-sync-swagger-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

import { UserDto } from './user.dto';

export class AuthSyncSwaggerResponseDto {
  @ApiProperty({ example: 200 })
  code!: number;

  @ApiProperty({ type: () => UserDto })
  data!: UserDto;

  @ApiProperty({ example: 'User synced successfully', required: false })
  message?: string;
}
