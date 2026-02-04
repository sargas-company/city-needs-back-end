import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessesCursorMetaDto {
  @ApiProperty({
    nullable: true,
    description: 'Cursor for loading next page',
    example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFoiLCJpZCI6ImFiYzEyMyJ9',
  })
  nextCursor!: string | null;

  @ApiProperty({
    description: 'Whether more items exist after this page',
    example: true,
  })
  hasNextPage!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: `
Total number of businesses matching filters.

NOTE:
- Disabled by default
- May be enabled later
- Null means "not calculated"
`,
    example: 342,
  })
  totalCount?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: `
Total pages.

NOTE:
- Only relevant for page-based pagination
- Not used for infinite scroll
`,
    example: 18,
  })
  totalPages?: number | null;
}
