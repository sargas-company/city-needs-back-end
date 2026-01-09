// src/modules/availability/dto/availability-response.dto.ts
import { AvailabilitySlotDto } from './availability-slot.dto';

export class AvailabilityResponseDto {
  businessId!: string;
  date!: string;
  timeZone!: string;

  slotStepMinutes!: number;
  bufferMinutes!: number;
  totalDurationMinutes!: number;

  slots!: AvailabilitySlotDto[];
}
