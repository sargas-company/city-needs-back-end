import { Prisma } from '@prisma/client';

/**
 * Builds SQL expression for distance calculation (meters)
 */
export function buildDistanceSql(lat: number, lng: number) {
  return Prisma.sql`
    6371000 * acos(
      LEAST(
        1.0,
        GREATEST(
          -1.0,
          cos(radians(${lat})) *
          cos(radians(l.lat)) *
          cos(radians(l.lng) - radians(${lng})) +
          sin(radians(${lat})) *
          sin(radians(l.lat))
        )
      )
    )
  `;
}
