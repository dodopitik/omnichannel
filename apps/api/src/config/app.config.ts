import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME || 'Omnichannel Marketplace API',
  port: parseInt(process.env.APP_PORT || '3001', 10),
  url: process.env.APP_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  throttleTtl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  webhookSecret: process.env.WEBHOOK_SECRET || 'default-webhook-secret',
}));
