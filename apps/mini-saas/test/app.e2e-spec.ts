import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { verify } from 'argon2';
import { UserEntity } from './../src/users/user.entity';
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

  async function createAuthenticatedClient(email = 'owner@example.com') {
    const password = 'correct horse battery staple';
    const agent = request.agent(app.getHttpServer());

    await agent.post('/auth/register').send({ email, password }).expect(201);
    const loginResponse = await agent
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const setCookieHeaders = loginResponse.headers['set-cookie'] as unknown;

    if (!Array.isArray(setCookieHeaders)) {
      throw new Error('Login response did not include a session cookie');
    }

    return {
      agent,
      cookie: (setCookieHeaders as string[])[0].split(';')[0],
    };
  }

  beforeEach(async () => {
    app = await createTestApp();
    await app
      .get(DataSource)
      .query(
        'TRUNCATE TABLE "projects", "users", "sessions" RESTART IDENTITY CASCADE',
      );
  });

  it('allows the frontend origin to make credentialed requests', () => {
    return request(app.getHttpServer())
      .options('/auth/me')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'http://localhost:5173')
      .expect('Access-Control-Allow-Credentials', 'true');
  });

  it('/auth/register creates a user without exposing credentials', async () => {
    const password = 'correct horse battery staple';
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'USER@Example.COM', password })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      email: 'user@example.com',
    });
    expect(typeof (response.body as Record<string, unknown>).createdAt).toBe(
      'string',
    );
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');

    const storedUser = await app
      .get(DataSource)
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: 'user@example.com' })
      .getOneOrFail();

    expect(storedUser.passwordHash).not.toBe(password);
    await expect(verify(storedUser.passwordHash, password)).resolves.toBe(true);
  });

  it('/auth/register returns 409 for a duplicate email', async () => {
    const registration = {
      email: 'user@example.com',
      password: 'correct horse battery staple',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registration)
      .expect(201);

    return request(app.getHttpServer())
      .post('/auth/register')
      .send(registration)
      .expect(409)
      .expect({
        message: 'Email is already registered',
        error: 'Conflict',
        statusCode: 409,
      });
  });

  it('/auth/register rejects an invalid email', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        password: 'correct horse battery staple',
      })
      .expect(400);
  });

  it('/auth/register rejects a short password', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'too-short' })
      .expect(400);
  });

  it('/auth/register rejects a client-provided password hash', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'user@example.com',
        password: 'correct horse battery staple',
        passwordHash: 'client-controlled-hash',
      })
      .expect(400);
  });

  it('/auth/login verifies credentials without exposing the password hash', async () => {
    const password = 'correct horse battery staple';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@example.com', password })
      .expect(201);

    const ordinaryUser = await app
      .get(DataSource)
      .getRepository(UserEntity)
      .findOneByOrFail({ email: 'user@example.com' });
    expect(ordinaryUser.passwordHash).toBeUndefined();

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'USER@Example.COM', password })
      .expect(200);

    expect(response.body).toMatchObject({
      id: 1,
      email: 'user@example.com',
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('/auth/login uses the same 401 response for unknown email and wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'user@example.com',
        password: 'correct horse battery staple',
      })
      .expect(201);

    const wrongPasswordResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'incorrect password' })
      .expect(401);
    const unknownEmailResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@example.com', password: 'incorrect password' })
      .expect(401);

    expect(wrongPasswordResponse.body).toEqual({
      message: 'Invalid email or password',
      error: 'Unauthorized',
      statusCode: 401,
    });
    expect(unknownEmailResponse.body).toEqual(wrongPasswordResponse.body);
  });

  it('/auth/me rejects a request without a session', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401).expect({
      message: 'Authentication required',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });

  it('keeps a login session across an API restart and destroys it on logout', async () => {
    const password = 'correct horse battery staple';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@example.com', password })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password })
      .expect(200);
    const setCookieHeaders = loginResponse.headers['set-cookie'] as unknown;

    expect(Array.isArray(setCookieHeaders)).toBe(true);
    const sessionCookieHeader = (setCookieHeaders as string[])[0];
    expect(sessionCookieHeader).toContain('mini_saas_session=');
    expect(sessionCookieHeader).toContain('HttpOnly');
    expect(sessionCookieHeader).toContain('SameSite=Lax');
    expect(sessionCookieHeader).toContain('Path=/');
    const sessionCookie = sessionCookieHeader.split(';')[0];

    await app.close();
    app = await createTestApp();

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: 1,
          email: 'user@example.com',
        });
      });

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', sessionCookie)
      .expect(204);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', sessionCookie)
      .expect(401);

    const sessionCountRows: unknown = await app
      .get(DataSource)
      .query('SELECT COUNT(*)::int AS count FROM "sessions"');
    expect(sessionCountRows).toEqual([{ count: 0 }]);
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

  describe('project authorization', () => {
    let ownerClient: Awaited<ReturnType<typeof createAuthenticatedClient>>;

    beforeEach(async () => {
      ownerClient = await createAuthenticatedClient();
    });

    it('/projects rejects an unauthenticated request', () => {
      return request(app.getHttpServer()).get('/projects').expect(401);
    });

    it('/projects (POST) assigns the authenticated user as owner', () => {
      return ownerClient.agent
        .post('/projects')
        .send({ name: 'My Project' })
        .expect(201)
        .expect({ id: 1, name: 'My Project', ownerId: 1 });
    });

    it('/projects (POST) rejects a client-provided ownerId', () => {
      return ownerClient.agent
        .post('/projects')
        .send({ name: 'My Project', ownerId: 999 })
        .expect(400);
    });

    it('/projects (GET) returns only projects owned by the current user', async () => {
      await ownerClient.agent
        .post('/projects')
        .send({ name: 'Project A' })
        .expect(201)
        .expect({ id: 1, name: 'Project A', ownerId: 1 });

      await ownerClient.agent
        .post('/projects')
        .send({ name: 'Project B' })
        .expect(201)
        .expect({ id: 2, name: 'Project B', ownerId: 1 });

      return ownerClient.agent
        .get('/projects')
        .expect(200)
        .expect([
          { id: 1, name: 'Project A', ownerId: 1 },
          { id: 2, name: 'Project B', ownerId: 1 },
        ]);
    });

    it('/projects persists owned projects after the API restarts', async () => {
      await ownerClient.agent
        .post('/projects')
        .send({ name: 'Persistent Project' })
        .expect(201)
        .expect({ id: 1, name: 'Persistent Project', ownerId: 1 });

      await app.close();
      app = await createTestApp();

      return request(app.getHttpServer())
        .get('/projects')
        .set('Cookie', ownerClient.cookie)
        .expect(200)
        .expect([{ id: 1, name: 'Persistent Project', ownerId: 1 }]);
    });

    it('/projects/:id (GET) returns an owned project', async () => {
      await ownerClient.agent
        .post('/projects')
        .send({ name: 'My Project' })
        .expect(201);

      return ownerClient.agent
        .get('/projects/1')
        .expect(200)
        .expect({ id: 1, name: 'My Project', ownerId: 1 });
    });

    it('/projects/:id (GET) rejects a non-numeric id', () => {
      return ownerClient.agent.get('/projects/abc').expect(400);
    });

    it('/projects/:id (GET) returns 404 for a missing project', () => {
      return ownerClient.agent.get('/projects/999').expect(404).expect({
        message: 'Project with id 999 not found',
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it("hides another user's project from every CRUD operation", async () => {
      const otherClient = await createAuthenticatedClient('other@example.com');
      await otherClient.agent
        .post('/projects')
        .send({ name: 'Other Project' })
        .expect(201)
        .expect({ id: 1, name: 'Other Project', ownerId: 2 });

      await ownerClient.agent.get('/projects').expect(200).expect([]);
      await ownerClient.agent.get('/projects/1').expect(404);
      await ownerClient.agent
        .patch('/projects/1')
        .send({ name: 'Stolen Project' })
        .expect(404);
      await ownerClient.agent.delete('/projects/1').expect(404);

      return otherClient.agent
        .get('/projects/1')
        .expect(200)
        .expect({ id: 1, name: 'Other Project', ownerId: 2 });
    });

    it('/projects/:id (PATCH) updates an owned project', async () => {
      await ownerClient.agent
        .post('/projects')
        .send({ name: 'Old Name' })
        .expect(201);

      await ownerClient.agent
        .patch('/projects/1')
        .send({ name: 'New Name' })
        .expect(200)
        .expect({ id: 1, name: 'New Name', ownerId: 1 });

      return ownerClient.agent
        .get('/projects/1')
        .expect(200)
        .expect({ id: 1, name: 'New Name', ownerId: 1 });
    });

    it('/projects/:id (PATCH) rejects an empty name', async () => {
      await ownerClient.agent
        .post('/projects')
        .send({ name: 'My Project' })
        .expect(201);

      return ownerClient.agent
        .patch('/projects/1')
        .send({ name: '' })
        .expect(400);
    });

    it('/projects/:id (PATCH) rejects a name over 100 characters', async () => {
      await ownerClient.agent
        .post('/projects')
        .send({ name: 'Original Name' })
        .expect(201);

      await ownerClient.agent
        .patch('/projects/1')
        .send({ name: 'a'.repeat(101) })
        .expect(400);

      return ownerClient.agent
        .get('/projects/1')
        .expect(200)
        .expect({ id: 1, name: 'Original Name', ownerId: 1 });
    });

    it('/projects/:id (PATCH) returns 404 for a missing project', () => {
      return ownerClient.agent
        .patch('/projects/999')
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('/projects/:id (DELETE) removes an owned project', async () => {
      await ownerClient.agent
        .post('/projects')
        .send({ name: 'My Project' })
        .expect(201);

      await ownerClient.agent.delete('/projects/1').expect(204);
      await ownerClient.agent.get('/projects/1').expect(404);

      return ownerClient.agent.get('/projects').expect(200).expect([]);
    });

    it('/projects/:id (DELETE) returns 404 for a missing project', () => {
      return ownerClient.agent.delete('/projects/999').expect(404);
    });

    it('/projects (POST) rejects a non-string name', () => {
      return ownerClient.agent
        .post('/projects')
        .send({ name: 123 })
        .expect(400);
    });

    it('/projects (POST) rejects an empty name', () => {
      return ownerClient.agent.post('/projects').send({ name: '' }).expect(400);
    });

    it('/projects (POST) rejects a name over 100 characters', () => {
      return ownerClient.agent
        .post('/projects')
        .send({ name: 'a'.repeat(101) })
        .expect(400);
    });

    it('/projects (POST) rejects an unexpected property', () => {
      return ownerClient.agent
        .post('/projects')
        .send({ name: 'My Project', isAdmin: true })
        .expect(400);
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
