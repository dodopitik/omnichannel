import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const appName = configService.get<string>('app.name', 'Omnichannel API');
  const frontendUrl = configService.get<string>('app.frontendUrl', 'http://localhost:3000');

  // ─── Security ─────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-refresh-token'],
  });

  // ─── Versioning ────────────────────────────────────────────
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─── Global Prefix ─────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── Global Pipes ──────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Filters ────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Global Interceptors ───────────────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new ResponseInterceptor(),
    new LoggingInterceptor(),
  );

  // ─── WebSocket ─────────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // ─── Swagger Documentation ─────────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appName)
      .setDescription('Enterprise Omnichannel Marketplace Management System API')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Roles', 'Role & permission management')
      .addTag('Dashboard', 'Dashboard statistics')
      .addTag('Marketplace', 'Marketplace management')
      .addTag('Products', 'Product management')
      .addTag('Inventory', 'Inventory management')
      .addTag('Orders', 'Order management')
      .addTag('Customers', 'Customer management')
      .addTag('Reports', 'Reporting')
      .addTag('Health', 'System health check')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
  }

  // ─── Graceful Shutdown ─────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 ${appName} running on http://localhost:${port}`);
  logger.log(`🌍 Environment: ${configService.get('NODE_ENV')}`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Failed to start application', err);
  process.exit(1);
});
