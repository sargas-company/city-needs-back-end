import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProductProcessor {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event) {
    const product = event.data.object as Stripe.Product;

    if (event.type === 'product.deleted') {
      await this.prisma.billingProduct.updateMany({
        where: { stripeProductId: product.id },
        data: { active: false },
      });
      return;
    }

    await this.prisma.billingProduct.upsert({
      where: { stripeProductId: product.id },
      update: {
        name: product.name,
        description: product.description,
        active: product.active,
      },
      create: {
        stripeProductId: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        kind: 'SUBSCRIPTION',
      },
    });
  }
}
