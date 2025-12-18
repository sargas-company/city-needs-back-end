import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessStatus, UserRole } from '@prisma/client';
import { Request } from 'express';

import { SKIP_BUSINESS_VERIFICATION_KEY } from '../decorators/skip-business-verification.decorator';
import { AuthedRequestGate } from '../types/request-content.type';

@Injectable()
export class BusinessVerificationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_BUSINESS_VERIFICATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest<Request & { gate?: AuthedRequestGate }>();

    const gate = req.gate;
    if (!gate) return true; // public routes / other auth

    // Only BUSINESS_OWNER
    if (gate.role !== UserRole.BUSINESS_OWNER) return true;

    // Don't block during onboarding
    // if (gate.onboardingStep !== null) return true;

    const biz = gate.business;

    // No business yet
    if (!biz.businessId) return true;

    // Category rules say verification is not required
    if (biz.requiresVerification !== true) return true;

    // Approved/active => allow
    if (biz.businessStatus === BusinessStatus.ACTIVE) return true;

    const deadline = biz.verificationGraceDeadlineAt;
    const now = new Date();

    // If deadline missing => treat as immediate required (block)
    const graceExpired = !deadline ? true : now >= deadline;
    if (!graceExpired) return true;

    throw new ForbiddenException({
      code: 403,
      details: {
        errorCode: 'VERIFICATION_REQUIRED',
        message: 'Business verification is required to continue using the app.',
        nextAction: 'GO_TO_VERIFICATION',
        businessId: biz.businessId,
        status: biz.businessStatus,
        graceDeadlineAt: deadline ?? null,
      },
    });
  }
}
