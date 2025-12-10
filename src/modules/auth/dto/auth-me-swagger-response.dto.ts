// src/modules/auth/dto/auth-me-swagger-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

import { UserDto } from './user.dto';

export class AuthMeSwaggerResponseDto {
  @ApiProperty({ example: 200 })
  code!: number;

  @ApiProperty({ type: () => UserDto })
  data!: UserDto;

  @ApiProperty({ example: 'Current user info', required: false })
  message?: string;
}
