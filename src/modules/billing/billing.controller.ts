import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { BillingService } from './billing.service';
import {
  SwaggerBillingCancelSubscription,
  SwaggerBillingPrices,
  SwaggerBillingProducts,
} from './billing.swagger';
import { BillingPricesQueryDto } from './dto/billing-prices-request.dto';

@Controller('billing')
@UseGuards(DbUserAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('products')
  @SwaggerBillingProducts()
  getProducts() {
    return this.billingService.getProducts();
  }

  @Get('prices')
  @SwaggerBillingPrices()
  getPrices(@Query() query: BillingPricesQueryDto) {
    return this.billingService.getPrices(query.productId);
  }

  @Post('subscription/cancel')
  @SwaggerBillingCancelSubscription()
  async cancel(@CurrentUser() user: User) {
    const result = await this.billingService.cancelAtPeriodEnd(user);

    return successResponse({
      status: 'CANCEL_AT_PERIOD_END',
      currentPeriodEndAt: result.currentPeriodEndAt,
    });
  }
}
