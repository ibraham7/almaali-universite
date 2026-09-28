import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app =
    await NestFactory.create(
      AppModule,
      { bodyParser: false },
    );

  app.use(json({ limit: '512kb' }));
  app.use(urlencoded({ limit: '512kb', extended: true }));

  const allowedOrigins = new Set([
    'http://localhost:5173',
    'https://almaali-web.onrender.com',
    'https://uni.novanoai.online',
    ...(process.env.CORS_ORIGINS ?? '').split(','),
  ].map((origin) => origin.trim()).filter(Boolean));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (
        error: Error | null,
        allow?: boolean,
      ) => void,
    ) => {
      if (
        !origin ||
        allowedOrigins.has(
          origin,
        )
      ) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          'Origin is not allowed by CORS',
        ),
      );
    },

    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port =
    Number(
      process.env.PORT ??
        3000,
    );

  await app.listen(
    port,
    '0.0.0.0',
  );
}

await bootstrap();
