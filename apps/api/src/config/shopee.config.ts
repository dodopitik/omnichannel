import { registerAs } from '@nestjs/config';

export const shopeeConfig = registerAs('shopee', () => {
  const environment = process.env.SHOPEE_ENVIRONMENT || 'test';
  const isProduction = environment === 'production';

  return {
    environment,
    isProduction,
    partnerId: isProduction
      ? parseInt(process.env.SHOPEE_PARTNER_ID || '0', 10)
      : parseInt(process.env.SHOPEE_TEST_PARTNER_ID || '0', 10),
    partnerKey: isProduction
      ? process.env.SHOPEE_PARTNER_KEY || ''
      : process.env.SHOPEE_TEST_PARTNER_KEY || '',
    baseUrl: isProduction
      ? process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com'
      : process.env.SHOPEE_TEST_BASE_URL || 'https://openplatform.sandbox.test-stable.shopee.sg',
    redirectUrl: process.env.SHOPEE_REDIRECT_URL || 'http://localhost:3001/api/v1/marketplace/shopee/callback',
    tokenRefreshBuffer: 3600, // Refresh 1 hour before expiry
    webhookPath: '/api/v1/marketplace/shopee/webhook',
  };
});
