// src/modules/auth/dto/user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class UserDto {
  @ApiProperty({ example: 'f1a2b3c4-...' })
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: 'user@example.com',
  })
  email!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: '+1234567890',
  })
  phone!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: 'John Doe',
  })
  username!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: 'https://example.com/avatar.png',
  })
  avatar!: string | null;

  @ApiProperty({
    enum: UserRole,
    nullable: true,
    required: false,
    example: UserRole.END_USER,
  })
  role!: UserRole | null;

  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @ApiProperty({ default: false })
  emailVerified!: boolean;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastVerificationEmailSentAt!: Date | null;

  @ApiProperty({ nullable: true, type: Number })
  onboardingStep!: number | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-12-09T14:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-12-09T14:05:00.000Z',
  })
  updatedAt!: Date;
}
