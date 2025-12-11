// src/modules/auth/dto/request-password-reset.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email of the user who requested password reset',
  })
  @IsEmail()
  email!: string;
}
