import { ApiProperty } from '@nestjs/swagger';

export class ReferralCodeResponseDto {
  @ApiProperty({ example: 'ABC123', description: 'User referral code' })
  referralCode!: string;
}
