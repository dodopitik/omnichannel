import { registerAs } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => ({
  host: process.env.MAIL_HOST || 'localhost',
  port: parseInt(process.env.MAIL_PORT || '1025', 10),
  secure: process.env.MAIL_SECURE === 'true',
  user: process.env.MAIL_USER || '',
  password: process.env.MAIL_PASSWORD || '',
  from: process.env.MAIL_FROM || 'Omnichannel <noreply@omnichannel.com>',
}));
