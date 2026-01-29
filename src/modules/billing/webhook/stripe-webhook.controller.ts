import { Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';

import { StripeWebhookService } from './stripe-webhook.service';

@Controller('billing/stripe')
export class StripeWebhookController {
  constructor(
    private readonly webhookService: StripeWebhookService,
    private readonly stripe: Stripe,
  ) {}

  @Post('webhook')
  async handle(@Req() req: Request & { rawBody: Buffer }) {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const event = this.stripe.webhooks.constructEvent(
      req.rawBody,
      signature as string,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    await this.webhookService.handleEvent(event);

    return { received: true };
  }
}
