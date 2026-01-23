import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { BusinessSort } from './dto/business-sort.enum';
import { GetBusinessesResponseDto } from './dto/get-businesses-response.dto';

export function BusinessPublicGetBusinessesSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Public businesses list',
      description: `
Returns a public list of businesses with filters, sorting and cursor-based pagination.

Pagination:
- Cursor-based (infinite scroll)
- No page numbers
- Cursor must be reused ONLY with the same filters and sorting
- totalCount is provided for UI needs but not required for pagination

Sorting:
- Default sorting is POPULAR
- Only ONE sorting method can be used per request
- Aliases (bestPrice, topRated) cannot be combined with "sort"

Invalid parameter combinations return 400 Bad Request.
      `,
    }),

    // ------------------------------------------------------
    // Filters
    // ------------------------------------------------------

    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: `
Search businesses by service name.

Rules:
- Enables price-based sorting and filtering
      `,
    }),

    ApiQuery({
      name: 'categoryId',
      required: false,
      type: String,
      description: 'Filter businesses by category',
    }),

    ApiQuery({
      name: 'city',
      required: false,
      type: String,
      description: 'Filter businesses by city',
    }),

    ApiQuery({
      name: 'priceMin',
      required: false,
      type: Number,
      description: `
Minimum service price.

Rules:
- Requires "search"
      `,
    }),

    ApiQuery({
      name: 'priceMax',
      required: false,
      type: Number,
      description: `
Maximum service price.

Rules:
- Requires "search"
      `,
    }),

    ApiQuery({
      name: 'openNow',
      required: false,
      type: Boolean,
      description: `
Show only businesses that are open at the moment of the request.
      `,
    }),

    // ------------------------------------------------------
    // Sorting
    // ------------------------------------------------------

    ApiQuery({
      name: 'sort',
      required: false,
      enum: BusinessSort,
      description: `
Sorting mode.

Rules:
- Default: POPULAR
- Cannot be combined with bestPrice or topRated

Additional constraints:
- PRICE_ASC / PRICE_DESC → requires search
- NEARBY → requires lat & lng
      `,
    }),

    ApiQuery({
      name: 'bestPrice',
      required: false,
      type: Boolean,
      description: `
Alias for PRICE_ASC.

Rules:
- Requires "search"
- Cannot be combined with sort or topRated
      `,
    }),

    ApiQuery({
      name: 'topRated',
      required: false,
      type: Boolean,
      description: `
Alias for TOP_RATED.

Rules:
- Cannot be combined with sort or bestPrice
      `,
    }),

    // ------------------------------------------------------
    // Geo
    // ------------------------------------------------------

    ApiQuery({
      name: 'lat',
      required: false,
      type: Number,
      description: `
Latitude.

Required when:
- sort = NEARBY
- withinKm is used
      `,
    }),

    ApiQuery({
      name: 'lng',
      required: false,
      type: Number,
      description: `
Longitude.

Required when:
- sort = NEARBY
- withinKm is used
      `,
    }),
    ApiQuery({
      name: 'withinKm',
      required: false,
      type: Number,
      description: `
Limits results to businesses within the given radius.

Allowed values:
- 1 → within 1km
- 5 → within 5km

Rules:
- Requires lat & lng
- Can be combined with any sorting mode
  `,
    }),

    // ------------------------------------------------------
    // Pagination
    // ------------------------------------------------------

    ApiQuery({
      name: 'cursor',
      required: false,
      type: String,
      description: `
Cursor for pagination.

Rules:
- Use cursor from the previous response
- Do not modify the cursor value
- Cursor must be used with the same filters and sorting
      `,
    }),

    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 10,
      description: 'Number of items to return',
    }),

    // ------------------------------------------------------
    // Response
    // ------------------------------------------------------

    ApiResponse({
      status: 200,
      description: 'Businesses list',
      type: GetBusinessesResponseDto,
    }),
  );
}
