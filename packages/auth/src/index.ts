import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

export const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign a JWT token
 */
export function signToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string | number,
): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken<T = Record<string, unknown>>(
  token: string,
  secret: string,
): T {
  return jwt.verify(token, secret) as T;
}

/**
 * Generate a secure random token (hex)
 */
export function generateSecureToken(byteLength = 32): string {
  const array = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(array);
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Minimal 8 karakter');
  if (!/[A-Z]/.test(password)) errors.push('Harus ada huruf besar');
  if (!/[a-z]/.test(password)) errors.push('Harus ada huruf kecil');
  if (!/\d/.test(password)) errors.push('Harus ada angka');
  if (!/[@$!%*?&]/.test(password)) errors.push('Harus ada karakter spesial (@$!%*?&)');

  return { isValid: errors.length === 0, errors };
}

export type { JwtPayload } from 'jsonwebtoken';
