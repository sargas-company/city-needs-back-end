// src/modules/onboarding/types/onboarding.types.ts
import { UserRole } from '@prisma/client';

export enum OnboardingAction {
  CUSTOMER_ADDRESS = 'CUSTOMER_ADDRESS',
  CUSTOMER_CATEGORIES = 'CUSTOMER_CATEGORIES',
  BUSINESS_PROFILE = 'BUSINESS_PROFILE',
  BUSINESS_ADDRESS = 'BUSINESS_ADDRESS',
  BUSINESS_FILES = 'BUSINESS_FILES',
  BUSINESS_VERIFICATION_SUBMIT = 'BUSINESS_VERIFICATION_SUBMIT',
  BUSINESS_VERIFICATION_SKIP = 'BUSINESS_VERIFICATION_SKIP',
}

export type OnboardingStatus = {
  isCompleted: boolean;
  role: UserRole | null;
  currentStep: number | null;
  totalSteps: number | null;
  allowedActions: OnboardingAction[];
  requiredScreen: OnboardingAction | null;
};
