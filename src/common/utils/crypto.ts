import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const SECRET = Buffer.from(process.env.APP_ENCRYPTION_KEY!, 'hex');

export function encryptAES(text: string) {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, SECRET, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptAES(text: string) {
  if (!text) return '';
  const raw = Buffer.from(text, 'base64');

  const iv = raw.slice(0, 12);
  const tag = raw.slice(12, 28);
  const encrypted = raw.slice(28);

  const decipher = crypto.createDecipheriv(ALGO, SECRET, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function maskKey(key: string) {
  if (!key) return '';

  const len = key.length;

  if (len <= 4) {
    return key[0] + '*'.repeat(len - 1);
  }

  if (len <= 8) {
    return key.slice(0, 2) + '*'.repeat(len - 3) + key.slice(-1);
  }

  return key.slice(0, 4) + '*'.repeat(len - 8) + key.slice(-4);
}
