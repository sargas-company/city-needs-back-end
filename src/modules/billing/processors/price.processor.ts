import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PriceProcessor {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event) {
    const price = event.data.object as Stripe.Price;

    if (!price.product || typeof price.product !== 'string') {
      return;
    }

    const product = await this.prisma.billingProduct.findUnique({
      where: { stripeProductId: price.product },
    });

    if (!product) {
      return;
    }

    if (event.type === 'price.deleted') {
      await this.prisma.billingPrice.updateMany({
        where: { stripePriceId: price.id },
        data: { active: false },
      });
      return;
    }

    if (!price.recurring) {
      return;
    }

    await this.prisma.billingPrice.upsert({
      where: { stripePriceId: price.id },
      update: {
        nickname: price.nickname,
        amount: price.unit_amount ?? 0,
        currency: price.currency.toUpperCase(),
        interval: price.recurring.interval,
        intervalCount: price.recurring.interval_count,
        taxInclusive: price.tax_behavior === 'inclusive',
        active: price.active,
      },
      create: {
        stripePriceId: price.id,
        productId: product.id,
        nickname: price.nickname,
        amount: price.unit_amount ?? 0,
        currency: price.currency.toUpperCase(),
        interval: price.recurring.interval,
        intervalCount: price.recurring.interval_count,
        taxInclusive: price.tax_behavior === 'inclusive',
        active: price.active,
      },
    });
  }
}
