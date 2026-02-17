import { ApiProperty } from '@nestjs/swagger';
import { BusinessVideoVerificationStatus } from '@prisma/client';

export class AdminBusinessVideoActionResponseDto {
  @ApiProperty()
  videoId!: string;

  @ApiProperty({ enum: BusinessVideoVerificationStatus })
  status!: BusinessVideoVerificationStatus;

  @ApiProperty()
  businessId!: string;
}
