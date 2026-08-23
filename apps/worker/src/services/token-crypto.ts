import * as crypto from 'crypto';

const PREFIX = 'enc:v1:';

function getKey(secret?: string) {
  return crypto.createHash('sha256').update(secret || 'default-marketplace-token-secret').digest();
}

export function decryptToken(value: string | null | undefined, secret?: string) {
  if (!value) return undefined;
  if (!value.startsWith(PREFIX)) return value;
  const payload = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
