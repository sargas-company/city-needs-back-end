import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { OnboardingAction } from '../types/onboarding.types';

export class OnboardingStatusDto {
  @ApiProperty({ enum: UserRole, nullable: true })
  role!: UserRole | null;

  @ApiProperty({ nullable: true, example: 1, description: 'null means onboarding completed' })
  onboardingStep!: number | null;

  @ApiProperty({ example: false })
  isCompleted!: boolean;

  @ApiProperty({ enum: OnboardingAction, example: OnboardingAction.CUSTOMER_ADDRESS })
  requiredScreen!: OnboardingAction;

  @ApiProperty({ enum: OnboardingAction, isArray: true })
  allowedActions!: OnboardingAction[];

  @ApiProperty({ nullable: true, example: 1 })
  currentStep!: number | null;

  @ApiProperty({ nullable: true, example: 2 })
  totalSteps!: number | null;
}
