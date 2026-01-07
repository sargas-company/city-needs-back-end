// src/modules/business/dto/update-business-logo.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBusinessLogoDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Business logo image (jpeg, png, webp)',
  })
  file!: any;
}
