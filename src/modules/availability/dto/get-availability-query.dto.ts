// src/modules/availability/dto/get-availability-query.dto.ts
import { IsArray, IsDateString, IsUUID, ArrayNotEmpty } from 'class-validator';

export class GetAvailabilityQueryDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  serviceIds!: string[];
}
