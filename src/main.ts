import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

// import dns from 'node:dns';
// dns.setServers(['1.1.1.1', '8.8.8.8']);

const BODY_PARSER_LIMIT = process.env.BODY_PARSER_LIMIT ?? '20mb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.use(json({ limit: BODY_PARSER_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_PARSER_LIMIT }));

  app.setGlobalPrefix('api');

  const origins =
    process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ??
    ['http://localhost:3000', 'http://localhost:3001', 'https://panalbee-providers.netlify.app'];

  app.enableCors({
    origin: origins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['X-Export-Id'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-push-token',
      'x-push-platform',
      'x-fcm-token',
      'x-fcm-platform',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const PORT = process.env.PORT || 7000;
  await app.listen(PORT);
  console.log(`Application is running on: http://localhost:${PORT}/api`);
}
bootstrap();
