import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { TsRestValidationFilter } from './common/filters/ts-rest-validation.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3001',
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
    new PrismaExceptionFilter(),
    new TsRestValidationFilter(),
  )

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
