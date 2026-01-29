import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '../../../prisma/prisma.service';
import { WebhookProcessorRouter } from '../processors/webhook-processor.router';

@Injectable()
export class StripeWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly router: WebhookProcessorRouter,
  ) {}

  async handleEvent(event: Stripe.Event): Promise<void> {
    const existing = await this.prisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existing?.processed) {
      return;
    }

    const record =
      existing ??
      (await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          payload: event as any,
          processed: false,
        },
      }));

    await this.router.process(event);

    await this.prisma.stripeWebhookEvent.update({
      where: { id: record.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  }
}
