import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class InvoiceProcessor {
  private readonly logger = new Logger(InvoiceProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;

    this.logger.log(`Received invoice event: ${invoice.id}`);

    try {
      let subscriptionId: string | null = null;

      const line = invoice.lines?.data?.[0];

      if (line && line.subscription) {
        const stripeSubscriptionId =
          typeof line.subscription === 'string' ? line.subscription : line.subscription.id;

        const billingSubscription = await this.prisma.billingSubscription.findUnique({
          where: { stripeSubscriptionId },
        });

        if (billingSubscription) {
          subscriptionId = billingSubscription.id;
        } else {
          this.logger.warn(
            `Billing subscription not found for stripeSubscriptionId=${stripeSubscriptionId}`,
          );
        }
      } else {
        this.logger.warn(`Invoice ${invoice.id} has no subscription line item`);
      }

      await this.prisma.billingInvoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        update: {
          subscriptionId,
          status: invoice.status?.toUpperCase() as any,
          amountPaid: invoice.amount_paid ?? 0,
          paidAt: invoice.status === 'paid' ? new Date() : null,
        },
        create: {
          stripeInvoiceId: invoice.id,
          subscriptionId,
          amountDue: invoice.amount_due ?? 0,
          amountPaid: invoice.amount_paid ?? 0,
          currency: invoice.currency.toUpperCase(),
          status: invoice.status?.toUpperCase() as any,
          hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
          invoicePdfUrl: invoice.invoice_pdf ?? null,
          issuedAt: new Date(invoice.created * 1000),
          paidAt: invoice.status === 'paid' ? new Date() : null,
        },
      });

      this.logger.log(`Invoice ${invoice.id} synced (subscriptionId=${subscriptionId ?? 'null'})`);
    } catch (error) {
      this.logger.error(
        `Failed to process invoice ${invoice.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
