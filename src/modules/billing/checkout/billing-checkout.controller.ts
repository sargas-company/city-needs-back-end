import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';

import { BillingCheckoutService } from './billing-checkout.service';
import { SwaggerBillingCheckout } from '../billing.swagger';
import { BillingCheckoutRequestDto } from '../dto/billing-checkout-request.dto';

@Controller('billing/checkout')
@SwaggerBillingCheckout()
export class BillingCheckoutController {
  constructor(private readonly checkoutService: BillingCheckoutService) {}

  @UseGuards(DbUserAuthGuard)
  @Post('session')
  createSession(@CurrentUser() user: User, @Body() body: BillingCheckoutRequestDto) {
    return this.checkoutService.createCheckoutSession(user.id, body.priceId);
  }
}
