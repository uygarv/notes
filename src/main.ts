import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
  });

  const config = new DocumentBuilder()
    .setTitle('Notes API')
    .setDescription('REST API for managing notes with tags')
    .setVersion('1.0')
    .addServer('/v1')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('v1/docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(
    new PrismaExceptionFilter()
  )

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
