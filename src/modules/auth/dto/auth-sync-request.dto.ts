// src/modules/auth/dto/auth-sync-request.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class AuthSyncRequestDto {
  @ApiPropertyOptional({
    description: 'Username to display in the app',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Optional role, can be set only once if current role is null',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Phone number in digits only, without spaces. Example: 14375556666',
    example: '14375556666',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'phone must contain 10-15 digits (digits only, no spaces or symbols)',
  })
  phone?: string;
}
