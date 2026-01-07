// src/modules/business/dto/business-logo.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class BusinessLogoDto {
  @ApiProperty({ example: 'c3b0f9c4-6c1e-4f61-9e5b-9f9e6a1c1234' })
  id!: string;

  @ApiProperty({ example: 'https://cdn.example.com/public/business/logo.png' })
  url!: string;
}
