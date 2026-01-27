import { Prisma } from '@prisma/client';
import { bookingConfig } from 'src/common/config/booking.config';

import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';

/**
 * Availability SQL fragment
 *
 * Contracts:
 * - availabilityDate is REQUIRED
 * - search is OPTIONAL
 * - priceMin / priceMax are OPTIONAL
 * - availability is always calculated for the SAME service
 * - ALL calculations are done in BUSINESS timezone
 */
export function buildAvailabilitySql(
  query: NormalizedBusinessesQuery,
  businessAlias = 'b',
): Prisma.Sql {
  const { availabilityDate, availabilityTime, search, priceMin, priceMax } = query;

  if (!availabilityDate) {
    return Prisma.empty;
  }

  const BUFFER_MINUTES = bookingConfig.bufferMinutes;

  return Prisma.sql`
    AND EXISTS (
      SELECT 1
      FROM business_services s
      WHERE s."businessId" = ${Prisma.raw(businessAlias)}.id
        AND s.status = 'ACTIVE'

        ${
          search
            ? Prisma.sql`
              AND s.name ILIKE ${'%' + search + '%'}
            `
            : Prisma.empty
        }

        ${
          priceMin !== undefined || priceMax !== undefined
            ? Prisma.sql`
                AND s.price BETWEEN ${priceMin ?? 0} AND ${priceMax ?? 1000000}
              `
            : Prisma.empty
        }

        AND ${
          availabilityTime
            ? availabilityAtSpecificTime(
                availabilityDate,
                availabilityTime,
                BUFFER_MINUTES,
                businessAlias,
              )
            : availabilityAtAnyTime(availabilityDate, BUFFER_MINUTES, businessAlias)
        }
    )
  `;
}

/**
 * --------------------------------------------------
 * Branch A — availabilityDate + availabilityTime
 * --------------------------------------------------
 * Checks ONE concrete slot in BUSINESS timezone
 */
function availabilityAtSpecificTime(
  availabilityDate: string,
  availabilityTime: string,
  bufferMinutes: number,
  businessAlias: string,
): Prisma.Sql {
  return Prisma.sql`
    EXISTS (
      WITH slot AS (
        SELECT (
          (${availabilityDate} || ' ' || ${availabilityTime})::timestamp
          AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone"
        ) AS start_at
      ),
      work_hours AS (
        SELECT
          CASE
            WHEN bh."is24h"
              THEN (${availabilityDate}::date AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone")
            ELSE ((${availabilityDate}::date + bh."startTime") AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone")
          END AS work_start,
          CASE
            WHEN bh."is24h"
              THEN ((${availabilityDate}::date + INTERVAL '1 day') AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone")
            ELSE ((${availabilityDate}::date + bh."endTime") AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone")
          END AS work_end
        FROM business_hours bh
        WHERE bh."businessId" = ${Prisma.raw(businessAlias)}.id
          AND bh.weekday = ((EXTRACT(DOW FROM ${availabilityDate}::date) + 6) % 7)
          AND bh."isClosed" = false
        LIMIT 1
      )
      SELECT 1
      FROM slot s0
      JOIN work_hours wh ON true
      WHERE
        (
          ${availabilityDate}::date > now()::date
          OR s0.start_at >= now()
        )

        AND s0.start_at >= wh.work_start
        AND (
          (
            NOT EXISTS (
              SELECT 1
              FROM bookings b
              WHERE b."businessId" = ${Prisma.raw(businessAlias)}.id
                AND b.status = 'CONFIRMED'
                AND b."startAt" < wh.work_end
                AND b."endAt"   > wh.work_start
            )
            AND
            s0.start_at
              + s.duration * INTERVAL '1 minute'
              <= wh.work_end
          )
          OR
          (
            EXISTS (
              SELECT 1
              FROM bookings b
              WHERE b."businessId" = ${Prisma.raw(businessAlias)}.id
                AND b.status = 'CONFIRMED'
                AND b."startAt" < wh.work_end
                AND b."endAt"   > wh.work_start
            )
            AND
            s0.start_at
              + (s.duration + ${bufferMinutes}) * INTERVAL '1 minute'
              <= wh.work_end
          )
        )

        AND NOT EXISTS (
          SELECT 1
          FROM bookings book
          WHERE book."businessId" = ${Prisma.raw(businessAlias)}.id
            AND book.status = 'CONFIRMED'
            AND book."startAt" < (
              s0.start_at
              + (s.duration + ${bufferMinutes}) * INTERVAL '1 minute'
            )
            AND book."endAt" > (
              s0.start_at
              - ${bufferMinutes} * INTERVAL '1 minute'
            )
        )
    )
  `;
}

/**
 * --------------------------------------------------
 * Branch B — availabilityDate only (any time)
 * --------------------------------------------------
 * Detects gaps using window functions
 * ALL time is normalized to BUSINESS timezone
 */
function availabilityAtAnyTime(
  availabilityDate: string,
  bufferMinutes: number,
  businessAlias: string,
): Prisma.Sql {
  return Prisma.sql`
    EXISTS (
      WITH work_hours AS (
        SELECT *
        FROM (
          SELECT
            CASE
              WHEN bh."is24h"
                THEN (
                  ${availabilityDate}::date
                  AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone"
                )
              ELSE (
                (${availabilityDate}::date + bh."startTime")
                AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone"
              )
            END AS work_start,

            CASE
              WHEN bh."is24h"
                THEN (
                  (${availabilityDate}::date + INTERVAL '1 day')
                  AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone"
                )
              ELSE (
                (${availabilityDate}::date + bh."endTime")
                AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone"
              )
            END AS work_end
          FROM business_hours bh
          WHERE bh."businessId" = ${Prisma.raw(businessAlias)}.id
            AND bh.weekday = ((EXTRACT(DOW FROM ${availabilityDate}::date) + 6) % 7)
            AND bh."isClosed" = false
          LIMIT 1
        ) wh
        WHERE
          ${availabilityDate}::date > now()::date
          OR (
            ${availabilityDate}::date = now()::date
            AND now() < wh.work_end
          )
      ),

      day_bookings AS (
        SELECT
          book."startAt" AS start_at,
          book."endAt"   AS end_at
        FROM bookings book
        JOIN work_hours wh ON true
        WHERE book."businessId" = ${Prisma.raw(businessAlias)}.id
          AND book.status = 'CONFIRMED'
          AND book."startAt" < wh.work_end
          AND book."endAt"   > wh.work_start
      ),

      ordered AS (
        SELECT
          start_at,
          end_at,
          LAG(end_at) OVER (ORDER BY start_at) AS prev_end,
          ROW_NUMBER() OVER (ORDER BY start_at) AS rn,
          COUNT(*) OVER () AS total
        FROM day_bookings
      )

      SELECT 1
      FROM work_hours wh
      WHERE
        (
          NOT EXISTS (SELECT 1 FROM day_bookings)
          AND
          wh.work_end
          - GREATEST(
            wh.work_start,
            now()
          )
            >= (s.duration + ${bufferMinutes}) * INTERVAL '1 minute'
        )
        OR
        (
          EXISTS (
            SELECT 1
            FROM (
              SELECT
                wh.work_start AS gap_start,
                o.start_at AS gap_end
              FROM ordered o
              WHERE o.rn = 1

              UNION ALL

              SELECT
                prev_end AS gap_start,
                start_at AS gap_end
              FROM ordered
              WHERE prev_end IS NOT NULL

              UNION ALL

              SELECT
                o.end_at AS gap_start,
                wh.work_end AS gap_end
              FROM ordered o
              WHERE o.rn = o.total
            ) gaps
            WHERE
              (
                gap_start > wh.work_start
                AND gap_end < wh.work_end
                AND gap_end - GREATEST(gap_start, now())
                    >= (s.duration + ${bufferMinutes} * 2) * INTERVAL '1 minute'
              )
              OR
              (
                (gap_start = wh.work_start OR gap_end = wh.work_end)
                AND gap_end - GREATEST(gap_start, now())
                    >= (s.duration + ${bufferMinutes}) * INTERVAL '1 minute'
              )
          )
        )
    )
  `;
}
