import { BadRequestException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BillingCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: Stripe,
  ) {}

  /**
   * Creates Stripe Checkout Session for subscription purchase
   * IMPORTANT:
   * - does NOT activate subscription in DB
   * - all state comes from Stripe webhooks
   */
  async createCheckoutSession(userId: string, stripePriceId: string) {
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: userId },
      include: {
        verifications: true,
      },
    });

    if (!business) {
      throw new BadRequestException('Business not found');
    }

    const isVerified = business.verifications.some((v) => v.status === 'APPROVED');

    if (!isVerified) {
      throw new BadRequestException('Business is not verified');
    }

    const price = await this.prisma.billingPrice.findUnique({
      where: { stripePriceId },
    });

    if (!price || !price.active) {
      throw new BadRequestException('Invalid or inactive billing price');
    }

    const existingSubscription = await this.prisma.billingSubscription.findFirst({
      where: {
        businessId: business.id,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('Active subscription already exists');
    }

    let billingCustomer = await this.prisma.billingCustomer.findUnique({
      where: { businessId: business.id },
    });

    if (!billingCustomer) {
      const stripeCustomer = await this.stripe.customers.create({
        metadata: {
          businessId: business.id,
        },
      });

      billingCustomer = await this.prisma.billingCustomer.create({
        data: {
          businessId: business.id,
          stripeCustomerId: stripeCustomer.id,
        },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: billingCustomer.stripeCustomerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/billing/success`,
      cancel_url: `${process.env.APP_URL}/billing/cancel`,
      metadata: {
        businessId: business.id,
      },
    });

    if (!session.url) {
      throw new BadRequestException('Failed to create checkout session');
    }

    return {
      checkoutUrl: session.url,
    };
  }
}
