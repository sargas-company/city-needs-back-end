import { ApiProperty } from '@nestjs/swagger';

export class GetStatusDtoResponse {
  @ApiProperty({
    enum: ['ok', 'error'],
    example: 'ok',
  })
  status!: 'ok' | 'error';

  @ApiProperty({
    enum: ['connected', 'disconnected'],
    example: 'connected',
  })
  database!: 'connected' | 'disconnected';

  @ApiProperty({
    example: '2025-12-08T13:22:10.502Z',
  })
  timestamp!: string;

  @ApiProperty({
    required: false,
    example: 'connection timeout',
  })
  error?: string;
}
