import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from './session/session.constants';

export const OPENAPI_JSON_PATH = 'openapi.json';

export function configureOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Mini SaaS API')
    .setDescription(
      'Learning API for projects, PostgreSQL persistence, and Cookie Session authentication.',
    )
    .setVersion('1.0')
    .addCookieAuth(SESSION_COOKIE_NAME, undefined, SESSION_COOKIE_NAME)
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: OPENAPI_JSON_PATH,
  });
}
