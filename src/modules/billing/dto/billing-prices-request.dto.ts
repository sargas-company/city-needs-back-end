import { IsUUID } from 'class-validator';

export class BillingPricesQueryDto {
  @IsUUID()
  productId!: string;
}
