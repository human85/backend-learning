import { readFileSync } from 'node:fs';
import { createServer, connect, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { parse } from 'dotenv';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { configureApp } from '../src/app.config';
import { ReadinessController } from '../src/readiness/readiness.controller';
import {
  ReadinessService,
  createReadinessPool,
} from '../src/readiness/readiness.service';

// Read-only SQL only. Faults affect this test's TCP proxy, never PostgreSQL itself.
const values = parse(readFileSync('.env.test.local'));
const databaseUrl = process.env.DATABASE_URL ?? values.DATABASE_URL;
const target = new URL(databaseUrl);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  target.pathname !== '/mini_saas_test'
) {
  throw new Error('Readiness experiments require local mini_saas_test');
}

describe('Readiness with real PostgreSQL and isolated network faults', () => {
  const sockets = new Set<Socket>();
  let blackhole = false;
  const proxy = createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => undefined);
    socket.on('close', () => sockets.delete(socket));
    if (blackhole) {
      socket.resume();
      return;
    }
    const upstream = connect(Number(target.port || 5432), target.hostname);
    sockets.add(upstream);
    upstream.on('close', () => sockets.delete(upstream));
    upstream.on('error', () => socket.destroy());
    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
    socket.pipe(upstream).pipe(socket);
  });
  let app: INestApplication;
  let server: Server;
  let output: jest.SpyInstance;
  let lines: string[];

  beforeAll(async () => {
    await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
    const proxyUrl = new URL(databaseUrl);
    proxyUrl.hostname = '127.0.0.1';
    proxyUrl.port = String((proxy.address() as AddressInfo).port);
    const module = await Test.createTestingModule({
      controllers: [AppController, ReadinessController],
      providers: [
        AppService,
        ReadinessService,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            DATABASE_URL: proxyUrl.toString(),
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
  afterAll(async () => {
    await app?.close();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  });

  it('transitions 200 → bounded 503 → 200 while health remains 200', async () => {
    const healthy = await request(server).get('/ready').expect(200);
    expect(healthy.body).toEqual({ status: 'ok' });
    expect(healthy.headers['cache-control']).toBe('no-store');
    blackhole = true;
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => setTimeout(resolve, 20));
    try {
      for (let round = 0; round < 2; round++) {
        const started = Date.now();
        const responses = await Promise.all(
          Array.from({ length: 8 }, () =>
            request(server).get('/ready').expect(503),
          ),
        );
        expect(Date.now() - started).toBeLessThan(2500);
        for (const response of responses) {
          expect(response.body).toEqual({ status: 'not_ready' });
          const records = lines.map(
            (line) => JSON.parse(line) as Record<string, unknown>,
          );
          expect(records).toContainEqual(
            expect.objectContaining({
              requestId: response.headers['x-request-id'],
              statusCode: 503,
              route: '/ready',
              failureKind: 'database_probe_failed',
            }),
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(sockets.size).toBe(0);
      }
      await request(server).get('/health').expect(200).expect({ status: 'ok' });
      expect(lines.join('')).not.toMatch(/postgres:|password|ECONN|SELECT/);
    } finally {
      blackhole = false;
    }
    await request(server).get('/ready').expect(200).expect({ status: 'ok' });
  });

  it('destroys an established connection when query responses stop arriving', async () => {
    await request(server).get('/ready').expect(200);
    for (const socket of sockets) socket.pause();
    const started = Date.now();
    await request(server).get('/ready').expect(503);
    expect(Date.now() - started).toBeLessThan(2000);
    await new Promise((resolve) => setTimeout(resolve, 30));
    // Unpause the test proxy so it observes the client's FIN after the timeout.
    for (const socket of sockets) socket.resume();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(sockets.size).toBe(0);
    await request(server).get('/ready').expect(200);
  });

  it('PostgreSQL cancels a slow statement and the failed client is discarded', async () => {
    const pool = createReadinessPool(databaseUrl);
    try {
      const client = await pool.connect();
      const started = Date.now();
      try {
        await expect(client.query('SELECT pg_sleep(3)')).rejects.toMatchObject({
          code: '57014',
        });
        expect(Date.now() - started).toBeLessThan(1500);
      } finally {
        client.release(true);
      }
      expect(pool.totalCount).toBe(0);
      await expect(pool.query('SELECT 1')).resolves.toBeDefined();
    } finally {
      await pool.end();
    }
  });
});
