import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ClaimReferralDto {
  @ApiProperty({ example: 'ABC123', description: '6-digit referral code' })
  @IsString()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]{6}$/)
  code!: string;
}

export class ClaimReferralDtoResponse {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: false, required: false })
  alreadyClaimed?: boolean;
}
