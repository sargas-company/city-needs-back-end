// src/modules/billing/billing.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PrismaService } from 'src/prisma/prisma.service';
import Stripe from 'stripe';

import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingCheckoutController } from './checkout/billing-checkout.controller';
import { BillingCheckoutService } from './checkout/billing-checkout.service';
import { CustomerProcessor } from './processors/customer.processor';
import { InvoiceProcessor } from './processors/invoice.processor';
import { PriceProcessor } from './processors/price.processor';
import { ProductProcessor } from './processors/product.processor';
import { SubscriptionProcessor } from './processors/subscription.processor';
import { WebhookProcessorRouter } from './processors/webhook-processor.router';
import { StripeWebhookController } from './webhook/stripe-webhook.controller';
import { StripeWebhookService } from './webhook/stripe-webhook.service';

@Module({
  imports: [FirebaseModule],
  controllers: [StripeWebhookController, BillingCheckoutController, BillingController],
  providers: [
    PrismaService,
    StripeWebhookService,
    WebhookProcessorRouter,
    CustomerProcessor,
    SubscriptionProcessor,
    InvoiceProcessor,
    BillingCheckoutService,
    ProductProcessor,
    PriceProcessor,
    BillingService,
    {
      provide: Stripe,
      useFactory: (config: ConfigService) => {
        const key = config.get<string>('STRIPE_SECRET_KEY');
        if (!key) {
          throw new Error('STRIPE_SECRET_KEY is missing');
        }
        return new Stripe(key);
      },
      inject: [ConfigService],
    },
  ],
})
export class BillingModule {}
