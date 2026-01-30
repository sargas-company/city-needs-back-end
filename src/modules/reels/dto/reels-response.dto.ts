import { ApiProperty } from '@nestjs/swagger';

export class ReelResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() businessId!: string;
  @ApiProperty() videoUrl!: string;
  @ApiProperty() createdAt!: Date;
}
