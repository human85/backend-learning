import { Injectable, NestMiddleware, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import connectPgSimple from 'connect-pg-simple';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import session from 'express-session';
import { SESSION_COOKIE_NAME, SESSION_TABLE_NAME } from './session.constants';

@Injectable()
export class SessionMiddleware implements NestMiddleware, OnModuleDestroy {
  private readonly store: connectPgSimple.PGStore;
  private readonly middleware: RequestHandler;

  constructor(configService: ConfigService) {
    const PostgresStore = connectPgSimple(session);
    const isProduction = configService.get('NODE_ENV') === 'production';

    this.store = new PostgresStore({
      conString: configService.getOrThrow('DATABASE_URL'),
      tableName: SESSION_TABLE_NAME,
      createTableIfMissing: false,
    });
    this.middleware = session({
      name: SESSION_COOKIE_NAME,
      secret: configService.getOrThrow('SESSION_SECRET'),
      store: this.store,
      resave: false,
      saveUninitialized: false,
      unset: 'destroy',
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        path: '/',
      },
    });
  }

  use(request: Request, response: Response, next: NextFunction): void {
    this.middleware(request, response, next);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.resolve(this.store.close());
  }
}
