// src/common/services/stripe.client.ts
import Stripe from 'stripe';

export const createStripeClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined');
  }

  return new Stripe(apiKey);
};
