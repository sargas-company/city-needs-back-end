import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { OnboardingStatusDto } from './dto/onboarding-status.dto';

export function SwaggerOnboardingTag() {
  return applyDecorators(ApiTags('Onboarding'));
}

export function SwaggerGetOnboardingStatus() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get onboarding status (DB truth)',
      description:
        'Role is selected via /auth/sync. This endpoint returns the current onboarding state computed from DB fields.',
    }),
    ApiOkResponse({ type: OnboardingStatusDto }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function SwaggerUpdateOnboardingStep() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update onboarding step',
      description:
        'Role is selected via /auth/sync. This endpoint updates onboardingStep only (DB truth).',
    }),
    ApiOkResponse({ type: OnboardingStatusDto }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function SwaggerCompleteOnboarding() {
  return applyDecorators(
    ApiOperation({
      summary: 'Complete onboarding (set step to null)',
      description: 'Marks onboarding as completed by setting onboardingStep = null.',
    }),
    ApiOkResponse({ type: OnboardingStatusDto }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
