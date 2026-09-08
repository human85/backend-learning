import {
  Controller,
  Get,
  Post,
  HttpCode,
  UnauthorizedException,
  type INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { configureApp } from '../src/app.config';

@Controller()
class ProbeController {
  @Get('probe/:id')
  async success() {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { ok: true };
  }

  @Post('empty')
  @HttpCode(204)
  empty() {}

  @Get('denied')
  denied() {
    throw new UnauthorizedException();
  }

  @Get('failure')
  failure() {
    throw new Error('postgres://user:secret@host/db password=secret');
  }
}

describe('Request logging HTTP contract (no database)', () => {
  let app: INestApplication;
  let server: Server;
  let lines: string[];
  let output: jest.SpyInstance;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({
            NODE_ENV: 'test',
            FRONTEND_ORIGIN: 'http://localhost:5173',
          }),
        },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    lines = [];
    output = jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
  });
  afterEach(() => output.mockRestore());
  afterAll(async () => app.close());

  function logs() {
    return lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  it('isolates concurrent IDs, ignores client IDs and excludes secret inputs', async () => {
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(server)
          .get('/probe/private-value?token=secret')
          .set('X-Request-ID', 'client-controlled')
          .set('Cookie', 'session=secret')
          .set('Authorization', 'Bearer secret')
          .set('Origin', 'http://localhost:5173')
          .expect(200),
      ),
    );
    const ids = responses.map((response) => response.headers['x-request-id']);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect(logs()).toContainEqual(
        expect.objectContaining({
          requestId: id,
          route: '/probe/:id',
          statusCode: 200,
          level: 'info',
        }),
      );
    }
    for (const entry of logs()) {
      expect(typeof entry.durationMs).toBe('number');
      expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    }
    expect(responses[0].headers['access-control-expose-headers']).toContain(
      'X-Request-ID',
    );
    expect(lines.join('')).not.toMatch(
      /secret|private-value|client-controlled/,
    );
  });

  it.each([
    ['/denied', 401, 'warn'],
    ['/failure', 500, 'error'],
    ['/missing-secret', 404, 'warn'],
  ])('correlates %s failures', async (path, status, level) => {
    const response = await request(server).get(path).expect(status);
    expect(logs()).toEqual([
      expect.objectContaining({
        requestId: response.headers['x-request-id'],
        statusCode: status,
        level,
      }),
    ]);
    expect(lines.join('')).not.toMatch(/secret|postgres|password/);
    if (status === 500) {
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  });

  it('keeps 204 empty and omits request bodies from logs', async () => {
    const response = await request(server)
      .post('/empty')
      .send({ password: 'secret' })
      .expect(204);
    expect(response.text).toBe('');
    expect(logs()).toEqual([
      expect.objectContaining({
        requestId: response.headers['x-request-id'],
        statusCode: 204,
      }),
    ]);
    expect(lines.join('')).not.toMatch(/password|secret/);
  });

  it('correlates malformed JSON before the controller', async () => {
    const response = await request(server)
      .post('/empty')
      .set('Content-Type', 'application/json')
      .send('{"password":"secret"')
      .expect(400);
    expect(logs()).toEqual([
      expect.objectContaining({
        requestId: response.headers['x-request-id'],
        statusCode: 400,
      }),
    ]);
    expect(lines.join('')).not.toMatch(/password|secret/);
  });
});
