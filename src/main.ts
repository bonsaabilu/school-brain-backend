import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// Trigger hot-reload to load new Prisma Client
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('School Management API')
    .setDescription(
      'Backend REST API documentation for managing schools, students, teachers, and grades.',
    )
    .setVersion('1.0')
    .addBearerAuth() // Enables JWT authentication token support in Swagger UI
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 5000);
}

bootstrap();
