import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SubscriptionProcessor {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event) {
    const sub = event.data.object as Stripe.Subscription;

    // eslint-disable-next-line no-useless-catch
    try {
      const stripeCustomerId = sub.customer as string;
      if (!stripeCustomerId) {
        return;
      }

      const billingCustomer = await this.prisma.billingCustomer.findUnique({
        where: { stripeCustomerId },
      });

      if (!billingCustomer) {
        return;
      }

      const businessId = billingCustomer.businessId;

      const item = sub.items.data[0];
      if (!item) {
        return;
      }

      const periodStart = item.current_period_start;
      const periodEnd = item.current_period_end;

      if (!periodStart || !periodEnd) {
        return;
      }

      const price = item.price;
      if (!price) {
        return;
      }

      const billingPrice = await this.prisma.billingPrice.findUnique({
        where: { stripePriceId: price.id },
      });

      if (!billingPrice) {
        return;
      }

      await this.prisma.billingSubscription.upsert({
        where: {
          stripeSubscriptionId: sub.id,
        },
        update: {
          status: sub.status.toUpperCase() as any,
          currentPeriodStartAt: new Date(periodStart * 1000),
          currentPeriodEndAt: new Date(periodEnd * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        create: {
          businessId,
          stripeSubscriptionId: sub.id,
          stripeCustomerId,
          priceId: billingPrice.id,
          status: sub.status.toUpperCase() as any,
          currentPeriodStartAt: new Date(periodStart * 1000),
          currentPeriodEndAt: new Date(periodEnd * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });
    } catch (error) {
      throw error;
    }
  }
}
