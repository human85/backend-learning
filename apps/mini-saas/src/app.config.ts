import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

interface ProxyAwareHttpInstance {
  set(setting: 'trust proxy', value: number): void;
}

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const isProduction = configService.get('NODE_ENV') === 'production';
  const corsOptions: CorsOptions = {
    origin: configService.getOrThrow<string>('FRONTEND_ORIGIN'),
    credentials: true,
  };

  if (isProduction) {
    const httpInstance = app
      .getHttpAdapter()
      .getInstance() as ProxyAwareHttpInstance;
    httpInstance.set('trust proxy', 1);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors(corsOptions);
}
