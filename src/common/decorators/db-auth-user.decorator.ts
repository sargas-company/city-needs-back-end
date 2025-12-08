import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const DbAuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().dbUser,
);
