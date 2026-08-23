import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
  accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  refreshRememberExpires: process.env.JWT_REFRESH_REMEMBER_EXPIRES || '30d',
}));
