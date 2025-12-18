import { SetMetadata } from '@nestjs/common';

export const SKIP_BUSINESS_VERIFICATION_KEY = 'skipBusinessVerification';

/**
 * Allows route/class to bypass BusinessVerificationGuard blocking.
 * Use for /auth/me, onboarding, and future verification routes.
 */
export const SkipBusinessVerification = () => SetMetadata(SKIP_BUSINESS_VERIFICATION_KEY, true);
