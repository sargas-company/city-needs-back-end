import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { successResponse } from 'src/common/utils/response.util';
import { PrismaService } from 'src/prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: Stripe,
  ) {}

  async getProducts() {
    const products = await this.prisma.billingProduct.findMany({
      where: { active: true, kind: 'SUBSCRIPTION' },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse({
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
    });
  }

  async getPrices(productId: string) {
    const prices = await this.prisma.billingPrice.findMany({
      where: {
        productId,
        active: true,
      },
      orderBy: [{ interval: 'asc' }, { intervalCount: 'asc' }, { sortOrder: 'asc' }],
    });

    return successResponse({
      data: prices.map((p) => ({
        stripePriceId: p.stripePriceId,
        nickname: p.nickname,
        amount: p.amount,
        currency: p.currency,
        interval: p.interval,
        intervalCount: p.intervalCount,
      })),
    });
  }

  async cancelAtPeriodEnd(user: User) {
    if (user.role !== UserRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Only business owner can cancel subscription');
    }

    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: user.id },
    });

    if (!business) {
      throw new BadRequestException('Business not found');
    }

    const subscription = await this.prisma.billingSubscription.findFirst({
      where: {
        businessId: business.id,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID'],
        },
        cancelAtPeriodEnd: false,
      },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription to cancel');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    const updated = await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    return {
      currentPeriodEndAt: updated.currentPeriodEndAt,
    };
  }
}
