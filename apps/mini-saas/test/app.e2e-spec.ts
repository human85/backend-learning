import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/app.config';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/projects (POST) accepts a valid project', () => {
    return request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'My Project' })
      .expect(201)
      .expect({ id: 1, name: 'My Project' });
  });

  it('/projects (GET) returns projects created in the same app process', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'Project A' })
      .expect(201)
      .expect({ id: 1, name: 'Project A' });

    await request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'Project B' })
      .expect(201)
      .expect({ id: 2, name: 'Project B' });

    return request(app.getHttpServer())
      .get('/projects')
      .expect(200)
      .expect([
        { id: 1, name: 'Project A' },
        { id: 2, name: 'Project B' },
      ]);
  });

  it('/projects/:id (GET) returns an existing project', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'My Project' })
      .expect(201);

    return request(app.getHttpServer())
      .get('/projects/1')
      .expect(200)
      .expect({ id: 1, name: 'My Project' });
  });

  it('/projects/:id (GET) rejects a non-numeric id', () => {
    return request(app.getHttpServer()).get('/projects/abc').expect(400);
  });

  it('/projects/:id (GET) returns 404 for a missing project', () => {
    return request(app.getHttpServer())
      .get('/projects/999')
      .expect(404)
      .expect({
        message: 'Project with id 999 not found',
        error: 'Not Found',
        statusCode: 404,
      });
  });

  it('/projects (POST) rejects a non-string name', () => {
    return request(app.getHttpServer())
      .post('/projects')
      .send({ name: 123 })
      .expect(400);
  });

  it('/projects (POST) rejects an empty name', () => {
    return request(app.getHttpServer())
      .post('/projects')
      .send({ name: '' })
      .expect(400);
  });

  it('/projects (POST) rejects an unexpected property', () => {
    return request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'My Project', isAdmin: true })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
