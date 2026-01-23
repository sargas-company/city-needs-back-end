import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessesCursorMetaDto {
  @ApiProperty({
    nullable: true,
    description: 'Cursor for loading next page',
  })
  nextCursor!: string | null;

  @ApiProperty({
    description: 'Whether more items exist after this page',
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
  })
  totalPages?: number | null;
}
