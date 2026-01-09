// src/modules/availability/dto/availability-params.dto.ts
import { IsUUID } from 'class-validator';

export class AvailabilityParamsDto {
  @IsUUID()
  businessId!: string;
}
