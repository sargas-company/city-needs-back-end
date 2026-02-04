import { BadRequestException } from '@nestjs/common';

import { AdminBusinessCursor } from './admin-cursor.types';

export function decodeAdminCursor(rawCursor: string): AdminBusinessCursor {
  try {
    const json = Buffer.from(rawCursor, 'base64').toString('utf8');
    const decoded = JSON.parse(json);

    if (!decoded || typeof decoded.createdAt !== 'string' || typeof decoded.id !== 'string') {
      throw new Error('Invalid cursor structure');
    }

    return decoded;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}
