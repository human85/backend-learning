import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.config';
import { AppModule } from './app.module';
import { configureOpenApi } from './openapi.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  configureOpenApi(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
