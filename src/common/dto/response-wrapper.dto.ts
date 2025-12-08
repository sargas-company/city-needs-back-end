import { ApiProperty } from '@nestjs/swagger';

export class ResponseWrapperDto<T> {
  @ApiProperty()
  code?: number;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ required: false })
  details?: unknown;
}
