import { ApiProperty } from '@nestjs/swagger';

import { CurrentVerificationFileDto } from './current-verification-file.dto';

export class GetCurrentVerificationFileResponseDto {
  @ApiProperty({
    oneOf: [{ type: CurrentVerificationFileDto }, { type: 'null' as any }],
    nullable: true,
  })
  file!: CurrentVerificationFileDto | null;
}
