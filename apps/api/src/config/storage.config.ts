import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  endpoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin_secret',
  bucket: process.env.MINIO_BUCKET || 'omnichannel',
  useSSL: process.env.MINIO_USE_SSL === 'true',
}));
