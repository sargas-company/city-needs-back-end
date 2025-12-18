import { BusinessStatus, User, UserRole } from '@prisma/client';

export type BusinessGateContext = {
  businessId: string | null;
  businessStatus: BusinessStatus | null;
  verificationGraceDeadlineAt: Date | null;
  requiresVerification: boolean | null;
};

export type AuthedRequestGate = {
  role: UserRole | null;
  onboardingStep: number | null;
  business: BusinessGateContext;
};

export type AuthedRequestContext = {
  user: User;
  gate: AuthedRequestGate;
};
