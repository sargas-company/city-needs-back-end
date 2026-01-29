import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

import { CustomerProcessor } from './customer.processor';
import { InvoiceProcessor } from './invoice.processor';
import { PriceProcessor } from './price.processor';
import { ProductProcessor } from './product.processor';
import { SubscriptionProcessor } from './subscription.processor';

@Injectable()
export class WebhookProcessorRouter {
  private readonly logger = new Logger(WebhookProcessorRouter.name);

  constructor(
    private readonly customerProcessor: CustomerProcessor,
    private readonly subscriptionProcessor: SubscriptionProcessor,
    private readonly invoiceProcessor: InvoiceProcessor,
    private readonly productProcessor: ProductProcessor,
    private readonly priceProcessor: PriceProcessor,
  ) {}

  async process(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.created':
        await this.customerProcessor.handle(event);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.subscriptionProcessor.handle(event);
        break;

      case 'invoice.created':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await this.invoiceProcessor.handle(event);
        break;

      case 'product.created':
      case 'product.updated':
      case 'product.deleted':
        await this.productProcessor.handle(event);
        break;

      case 'price.created':
      case 'price.updated':
      case 'price.deleted':
        await this.priceProcessor.handle(event);
        break;

      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }
}
