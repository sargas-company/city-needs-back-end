import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { BillingCancelSubscriptionResponseDto } from './dto/billing-cancel-subscription-response.dto';
import { BillingCheckoutResponseDto } from './dto/billing-checkout-response.dto';
import { BillingPricesResponseDto } from './dto/billing-prices-response.dto';
import { BillingProductsResponseDto } from './dto/billing-products-response.dto';

export function SwaggerBillingCheckout() {
  return applyDecorators(
    ApiTags('Billing'),
    ApiOkResponse({
      description: 'Creates Stripe Checkout Session for subscription purchase',
      type: BillingCheckoutResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Invalid price, business not verified, or subscription already exists',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}

export function SwaggerBillingProducts() {
  return applyDecorators(
    ApiTags('Billing'),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Returns active billing products',
      type: BillingProductsResponseDto,
    }),
  );
}

export function SwaggerBillingPrices() {
  return applyDecorators(
    ApiTags('Billing'),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Returns active prices for billing product',
      type: BillingPricesResponseDto,
    }),
  );
}

export function SwaggerBillingCancelSubscription() {
  return applyDecorators(
    ApiTags('Billing'),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Schedules subscription cancellation at the end of current billing period',
      type: BillingCancelSubscriptionResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'No active subscription or subscription already scheduled for cancellation',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
