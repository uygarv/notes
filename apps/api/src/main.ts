import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { TsRestValidationFilter } from './common/filters/ts-rest-validation.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { FallbackExceptionFilter } from './common/filters/fallback-exception.filter';
import { SessionCookieMigrationInterceptor } from './auth/session-cookie-migration.interceptor';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const normalizeOrigin = (value: string) => value.replace(/\/+$/, '');
  const webUrl = normalizeOrigin(
    process.env.WEB_URL ?? 'http://localhost:3001',
  );
  const corsOrigins = new Set(
    [webUrl, ...(process.env.CORS_ORIGINS?.split(',') ?? [])]
      .map((origin) => normalizeOrigin(origin.trim()))
      .filter(Boolean),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  });
  app.use(cookieParser());

  app.enableVersioning({
    type: VersioningType.URI,
  });

  const config = new DocumentBuilder()
    .setTitle('Notes API')
    .setDescription('REST API for managing notes with tags')
    .setVersion('1.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(
    new FallbackExceptionFilter(),
    new PrismaExceptionFilter(),
    new TsRestValidationFilter(),
    new HttpExceptionFilter(),
  );

  app.useGlobalInterceptors(new SessionCookieMigrationInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
