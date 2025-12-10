// src/modules/status/dto/status-check.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetStatusDtoResponse {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status!: 'ok' | 'error';

  @ApiProperty({ example: 'connected', enum: ['connected', 'disconnected'] })
  database!: 'connected' | 'disconnected';

  @ApiProperty({ example: new Date().toISOString() })
  timestamp!: string;

  @ApiPropertyOptional({ example: 'Database connection failed' })
  error?: string;
}
