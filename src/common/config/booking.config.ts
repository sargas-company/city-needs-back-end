// src/common/config/booking.config.ts
export const bookingConfig = {
  slotStepMinutes: Number(process.env.BOOKING_SLOT_STEP_MINUTES ?? 10),
  bufferMinutes: Number(process.env.BOOKING_BUFFER_MINUTES ?? 10),
};
