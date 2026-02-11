import { ApiProperty } from '@nestjs/swagger';
import { ReelStatus } from '@prisma/client';

export class ReelResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  videoUrl!: string;

  @ApiProperty({ enum: ReelStatus, enumName: 'ReelStatus' })
  status!: ReelStatus;

  @ApiProperty({ type: Date, nullable: true })
  submittedAt!: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  rejectionReason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
