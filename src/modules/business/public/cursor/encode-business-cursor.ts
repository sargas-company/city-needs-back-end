import { BusinessCursor } from './types';

export function encodeBusinessCursor(payload: BusinessCursor): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
