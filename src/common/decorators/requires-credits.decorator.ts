import { SetMetadata } from '@nestjs/common';

export const CREDITS_ACTION_KEY = 'credits:action';
export enum CreditAction {
  PROJECT_GENERATION = 'PROJECT_GENERATION',
  PROJECT_DEPLOYMENT = 'PROJECT_DEPLOYMENT',
  PROJECT_EDITING = 'PROJECT_EDITING',
  PROJECT_SUGGESTION = 'PROJECT_SUGGESTION',
  IMAGE_GENERATION = 'IMAGE_GENERATION',
}

export const RequiresCredits = (action: CreditAction) => SetMetadata(CREDITS_ACTION_KEY, action);
