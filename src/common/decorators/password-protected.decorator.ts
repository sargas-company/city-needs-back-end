import { SetMetadata } from '@nestjs/common';

export const PASSWORD_PROTECTED_KEY = 'passwordProtected';
export const PasswordProtected = (password: string) =>
  SetMetadata(PASSWORD_PROTECTED_KEY, password);
