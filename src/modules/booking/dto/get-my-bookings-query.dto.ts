import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination.dto';

export class GetMyBookingsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Return only completed bookings without reviews',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  withoutReview?: boolean;
}
