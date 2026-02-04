import { AdminBusinessCursor } from './admin-cursor.types';

export function encodeAdminCursor(payload: AdminBusinessCursor): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
