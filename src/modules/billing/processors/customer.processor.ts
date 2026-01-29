import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CustomerProcessor {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event) {
    const customer = event.data.object as Stripe.Customer;

    if (!customer.metadata?.businessId) {
      return;
    }

    await this.prisma.billingCustomer.upsert({
      where: { stripeCustomerId: customer.id },
      update: {},
      create: {
        stripeCustomerId: customer.id,
        businessId: customer.metadata.businessId,
      },
    });
  }
}
