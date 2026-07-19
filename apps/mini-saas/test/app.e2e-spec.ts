import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApp } from './../src/app.config';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  async function createTestApp(): Promise<INestApplication<App>> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const testApp = moduleFixture.createNestApplication();
    configureApp(testApp);
    await testApp.init();

    return testApp;
  }

  beforeEach(async () => {
    app = await createTestApp();
    await app
      .get(DataSource)
      .query('TRUNCATE TABLE "projects" RESTART IDENTITY');
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

  it('/projects persists projects after the API restarts', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'Persistent Project' })
      .expect(201)
      .expect({ id: 1, name: 'Persistent Project' });

    await app.close();
    app = await createTestApp();

    return request(app.getHttpServer())
      .get('/projects')
      .expect(200)
      .expect([{ id: 1, name: 'Persistent Project' }]);
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

  it('/projects/:id (PATCH) updates an existing project', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'Old Name' })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/projects/1')
      .send({ name: 'New Name' })
      .expect(200)
      .expect({ id: 1, name: 'New Name' });

    return request(app.getHttpServer())
      .get('/projects/1')
      .expect(200)
      .expect({ id: 1, name: 'New Name' });
  });

  it('/projects/:id (PATCH) rejects an empty name', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'My Project' })
      .expect(201);

    return request(app.getHttpServer())
      .patch('/projects/1')
      .send({ name: '' })
      .expect(400);
  });

  it('/projects/:id (PATCH) returns 404 for a missing project', () => {
    return request(app.getHttpServer())
      .patch('/projects/999')
      .send({ name: 'New Name' })
      .expect(404);
  });

  it('/projects/:id (DELETE) removes an existing project', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .send({ name: 'My Project' })
      .expect(201);

    await request(app.getHttpServer()).delete('/projects/1').expect(204);

    await request(app.getHttpServer()).get('/projects/1').expect(404);

    return request(app.getHttpServer()).get('/projects').expect(200).expect([]);
  });

  it('/projects/:id (DELETE) returns 404 for a missing project', () => {
    return request(app.getHttpServer()).delete('/projects/999').expect(404);
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
