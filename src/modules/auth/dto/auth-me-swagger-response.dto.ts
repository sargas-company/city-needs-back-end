// src/modules/auth/dto/auth-me-swagger-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

import { AuthMeDto } from './auth-me.dto';

export class AuthMeSwaggerResponseDto {
  @ApiProperty({ example: 200 })
  code!: number;

  @ApiProperty({ type: () => AuthMeDto })
  data!: AuthMeDto;

  @ApiProperty({ example: 'Current user info', required: false })
  message?: string;
}
