import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const corsOptions: CorsOptions = {
    origin: configService.getOrThrow<string>('FRONTEND_ORIGIN'),
    credentials: true,
  };

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors(corsOptions);
}
