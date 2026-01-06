import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Public display name',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'New email address (requires recent authentication)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Phone number',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({
    example: 'NewStrongPassword123!',
    description: 'New password (requires recent authentication)',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password?: string;
}
