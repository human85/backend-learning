import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { verify } from 'argon2';
import { UserEntity } from './../src/users/user.entity';
import { configureApp } from './../src/app.config';
import { AppModule } from './../src/app.module';
import { configureOpenApi, OPENAPI_JSON_PATH } from './../src/openapi.config';
import { SESSION_COOKIE_NAME } from './../src/session/session.constants';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  async function createTestApp(
    configOverrides?: Record<string, string>,
  ): Promise<INestApplication<App>> {
    const testingModuleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    if (configOverrides) {
      testingModuleBuilder.overrideProvider(ConfigService).useValue({
        get<T>(key: string): T | undefined {
          return configOverrides[key] as T | undefined;
        },
        getOrThrow<T>(key: string): T {
          const value = configOverrides[key];

          if (value === undefined) {
            throw new Error(`Missing test configuration: ${key}`);
          }

          return value as T;
        },
      });
    }

    const moduleFixture: TestingModule = await testingModuleBuilder.compile();

    const testApp = moduleFixture.createNestApplication();
    configureApp(testApp);
    configureOpenApi(testApp);
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
    const frontendOrigin = app
      .get(ConfigService)
      .getOrThrow<string>('FRONTEND_ORIGIN');

    return request(app.getHttpServer())
      .options('/auth/me')
      .set('Origin', frontendOrigin)
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect('Access-Control-Allow-Origin', frontendOrigin)
      .expect('Access-Control-Allow-Credentials', 'true');
  });

  it('publishes an OpenAPI contract without sensitive user fields', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${OPENAPI_JSON_PATH}`)
      .expect(200);
    const document = response.body as {
      components: {
        schemas: Record<string, { properties: Record<string, unknown> }>;
        securitySchemes: Record<string, unknown>;
      };
      paths: Record<
        string,
        Record<string, { security?: Array<Record<string, unknown>> }>
      >;
    };
    const publicUserProperties =
      document.components.schemas.PublicUserDto.properties;

    expect(publicUserProperties).toHaveProperty('id');
    expect(publicUserProperties).toHaveProperty('email');
    expect(publicUserProperties).toHaveProperty('createdAt');
    expect(publicUserProperties).not.toHaveProperty('password');
    expect(publicUserProperties).not.toHaveProperty('passwordHash');
    expect(document.components.securitySchemes).toHaveProperty(
      SESSION_COOKIE_NAME,
    );
    expect(document.paths['/projects'].get.security).toEqual([
      { [SESSION_COOKIE_NAME]: [] },
    ]);
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

  it('/auth/login sets a secure cookie behind the production HTTPS proxy', async () => {
    const configService = app.get(ConfigService);
    const productionConfig = {
      NODE_ENV: 'production',
      DATABASE_URL: configService.getOrThrow<string>('DATABASE_URL'),
      SESSION_SECRET: configService.getOrThrow<string>('SESSION_SECRET'),
      FRONTEND_ORIGIN: configService.getOrThrow<string>('FRONTEND_ORIGIN'),
    };
    await app.close();
    app = await createTestApp(productionConfig);
    const password = 'correct horse battery staple';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@example.com', password })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ email: 'user@example.com', password })
      .expect(200);
    const setCookieHeaders = response.headers['set-cookie'] as unknown;

    expect(Array.isArray(setCookieHeaders)).toBe(true);
    expect((setCookieHeaders as string[])[0]).toContain('Secure');
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

  it('/ready (GET) checks PostgreSQL through the real application wiring', () => {
    return request(app.getHttpServer())
      .get('/ready')
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({ status: 'ok' });
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

  describe('creating project invitations', () => {
    let owner: Awaited<ReturnType<typeof createAuthenticatedClient>>;
    let invitee: Awaited<ReturnType<typeof createAuthenticatedClient>>;

    beforeEach(async () => {
      owner = await createAuthenticatedClient();
      invitee = await createAuthenticatedClient('invitee@example.com');
      await owner.agent
        .post('/projects')
        .send({ name: 'Invitation project' })
        .expect(201);
    });

    async function invitationCount() {
      const rows = await app
        .get(DataSource)
        .query<Array<{ count: number }>>(
          'SELECT count(*)::int AS count FROM invitations',
        );
      return rows[0].count;
    }

    it('creates pending invitation from Session identity without granting membership', async () => {
      const response = await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 2 })
        .expect(201);
      expect(response.body).toEqual({
        id: expect.any(Number) as unknown,
        projectId: 1,
        inviterId: 1,
        inviteeId: 2,
        status: 'pending',
        createdAt: expect.any(String) as unknown,
      });
      expect(response.headers['x-request-id']).toEqual(expect.any(String));
      const rows = await app
        .get(DataSource)
        .query<Array<{ inviter_id: number }>>(
          'SELECT inviter_id FROM invitations',
        );
      expect(rows).toEqual([{ inviter_id: 1 }]);
      expect(
        await app.get(DataSource).query('SELECT * FROM project_members'),
      ).toEqual([]);
      await invitee.agent.get('/projects/1').expect(404);
    });

    it('requires a Session to list received invitations', async () => {
      await request(app.getHttpServer()).get('/invitations').expect(401);
    });

    it('returns an empty array for a recipient with no invitations', async () => {
      await invitee.agent.get('/invitations').expect(200).expect([]);
    });

    it('lists only the Session recipient including history, newest first', async () => {
      const other = await createAuthenticatedClient(
        'other-invitee@example.com',
      );
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 2 })
        .expect(201);
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 3 })
        .expect(201);
      await app
        .get(DataSource)
        .query(
          "UPDATE invitations SET status = 'accepted' WHERE invitee_id = 2",
        );
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 2 })
        .expect(201);

      const response = await invitee.agent
        .get('/invitations')
        .expect(200)
        .expect('Cache-Control', 'no-store');
      const invitations = response.body as Array<Record<string, unknown>>;
      expect(
        invitations.map(({ id, inviteeId, status }) => ({
          id,
          inviteeId,
          status,
        })),
      ).toEqual([
        { id: 3, inviteeId: 2, status: 'pending' },
        { id: 1, inviteeId: 2, status: 'accepted' },
      ]);
      for (const invitation of invitations) {
        expect(Object.keys(invitation).sort()).toEqual([
          'createdAt',
          'id',
          'inviteeId',
          'inviterId',
          'projectId',
          'status',
        ]);
      }
      const otherResponse = await other.agent.get('/invitations').expect(200);
      expect(
        (otherResponse.body as Array<{ id: number }>).map(({ id }) => id),
      ).toEqual([2]);
      await owner.agent.get('/invitations').expect(200).expect([]);
    });

    it('rejects query parameters instead of using them to choose a recipient', async () => {
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 2 })
        .expect(201);
      for (const query of [
        'userId=1',
        'inviteeId=1',
        'userId=1&userId=2',
        'status=pending',
      ]) {
        await invitee.agent.get(`/invitations?${query}`).expect(400);
      }
      const response = await invitee.agent.get('/invitations').expect(200);
      expect(response.body).toMatchObject([{ inviteeId: 2 }]);
    });

    describe('accepting a received invitation', () => {
      beforeEach(async () => {
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 2 })
          .expect(201);
      });

      it('atomically accepts and stores exactly the Session user membership', async () => {
        const response = await invitee.agent
          .post('/invitations/1/accept')
          .expect(200);
        expect(response.body).toMatchObject({
          id: 1,
          projectId: 1,
          inviterId: 1,
          inviteeId: 2,
          status: 'accepted',
        });
        expect(
          await app
            .get(DataSource)
            .query('SELECT status FROM invitations WHERE id = 1'),
        ).toEqual([{ status: 'accepted' }]);
        expect(
          await app
            .get(DataSource)
            .query('SELECT project_id, member_id FROM project_members'),
        ).toEqual([{ project_id: 1, member_id: 2 }]);
        const list = await invitee.agent.get('/invitations').expect(200);
        expect(list.body).toMatchObject([{ id: 1, status: 'accepted' }]);
      });

      it('requires the Session recipient and validates IDs and unexpected inputs', async () => {
        await request(app.getHttpServer())
          .post('/invitations/1/accept')
          .expect(401);
        await owner.agent.post('/invitations/1/accept').expect(404);
        await invitee.agent.post('/invitations/999/accept').expect(404);
        for (const id of ['abc', '0', '-1', '2147483648']) {
          await invitee.agent.post(`/invitations/${id}/accept`).expect(400);
        }
        await invitee.agent
          .post('/invitations/1/accept')
          .send({ userId: 1 })
          .expect(400);
        await invitee.agent
          .post('/invitations/1/accept')
          .send({ status: 'accepted' })
          .expect(400);
        await invitee.agent
          .post('/invitations/1/accept?inviteeId=1')
          .expect(400);
        expect(
          await app.get(DataSource).query('SELECT status FROM invitations'),
        ).toEqual([{ status: 'pending' }]);
        expect(
          await app.get(DataSource).query('SELECT * FROM project_members'),
        ).toEqual([]);
      });

      it('returns success for concurrent and later retries without duplicate members', async () => {
        const responses = await Promise.all([
          invitee.agent.post('/invitations/1/accept'),
          invitee.agent.post('/invitations/1/accept'),
        ]);
        expect(responses.map(({ status }) => status)).toEqual([200, 200]);
        await invitee.agent.post('/invitations/1/accept').expect(200);
        expect(
          await app
            .get(DataSource)
            .query('SELECT project_id, member_id FROM project_members'),
        ).toEqual([{ project_id: 1, member_id: 2 }]);
      });

      it('does not restore membership from a used invitation after leaving', async () => {
        await invitee.agent.post('/invitations/1/accept').expect(200);
        // Arrange a leave result; the leave API is a later implementation slice.
        await app
          .get(DataSource)
          .query('DELETE FROM project_members WHERE member_id = 2');
        await invitee.agent.post('/invitations/1/accept').expect(409);
        expect(
          await app.get(DataSource).query('SELECT * FROM project_members'),
        ).toEqual([]);
      });

      it('rejects rejected invitations and pending invitations to existing members', async () => {
        await app
          .get(DataSource)
          .query("UPDATE invitations SET status = 'rejected' WHERE id = 1");
        await invitee.agent.post('/invitations/1/accept').expect(409);
        await app
          .get(DataSource)
          .query("UPDATE invitations SET status = 'pending' WHERE id = 1");
        await app
          .get(DataSource)
          .query(
            'INSERT INTO project_members (project_id, member_id) VALUES (1, 2)',
          );
        await invitee.agent.post('/invitations/1/accept').expect(409);
        expect(
          await app.get(DataSource).query('SELECT status FROM invitations'),
        ).toEqual([{ status: 'pending' }]);
      });

      it('keeps pending invitations valid after the project changes owner', async () => {
        await createAuthenticatedClient('new-owner@example.com');
        // Arrange transferred ownership, not a test of the future transfer API.
        await app
          .get(DataSource)
          .query('UPDATE projects SET owner_id = 3 WHERE id = 1');
        const response = await invitee.agent
          .post('/invitations/1/accept')
          .expect(200);
        expect(response.body).toMatchObject({
          inviterId: 1,
          inviteeId: 2,
          status: 'accepted',
        });
      });

      it('treats a later owner as already authorized without recreating ordinary membership', async () => {
        await invitee.agent.post('/invitations/1/accept').expect(200);
        await app
          .get(DataSource)
          .query('UPDATE projects SET owner_id = 2 WHERE id = 1');
        await app
          .get(DataSource)
          .query('DELETE FROM project_members WHERE member_id = 2');
        await invitee.agent.post('/invitations/1/accept').expect(200);
        expect(
          await app.get(DataSource).query('SELECT * FROM project_members'),
        ).toEqual([]);
      });

      it('rolls back accepted status if member insertion fails and permits retry', async () => {
        const database = app.get(DataSource);
        await database.query(`
          CREATE FUNCTION test_reject_membership() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'simulated membership write failure'; END; $$;
          CREATE TRIGGER test_reject_membership BEFORE INSERT ON project_members
          FOR EACH ROW EXECUTE FUNCTION test_reject_membership();
        `);
        try {
          await invitee.agent.post('/invitations/1/accept').expect(500);
          expect(
            await database.query('SELECT status FROM invitations'),
          ).toEqual([{ status: 'pending' }]);
          expect(await database.query('SELECT * FROM project_members')).toEqual(
            [],
          );
        } finally {
          await database.query(
            'DROP TRIGGER test_reject_membership ON project_members',
          );
          await database.query('DROP FUNCTION test_reject_membership()');
        }
        await invitee.agent.post('/invitations/1/accept').expect(200);
      });
    });

    it('requires a logged-in Session', async () => {
      await request(app.getHttpServer())
        .post('/projects/1/invitations')
        .send({ inviteeId: 2 })
        .expect(401);
      expect(await invitationCount()).toBe(0);
    });

    it('rejects malformed IDs, spoofed identity and client-controlled status', async () => {
      for (const body of [
        {},
        { inviteeId: '2' },
        { inviteeId: 0 },
        { inviteeId: 1.5 },
        { inviteeId: null },
        { inviteeId: 2147483648 },
        { inviteeId: 2, inviterId: 1 },
        { inviteeId: 2, status: 'accepted' },
      ]) {
        await owner.agent
          .post('/projects/1/invitations')
          .send(body)
          .expect(400);
      }
      for (const id of ['abc', '0', '-1', '1.5', '2147483648']) {
        await owner.agent
          .post(`/projects/${id}/invitations`)
          .send({ inviteeId: 2 })
          .expect(400);
      }
      expect(await invitationCount()).toBe(0);
    });

    it('hides missing projects and rejects both strangers and ordinary members', async () => {
      await owner.agent
        .post('/projects/999/invitations')
        .send({ inviteeId: 2 })
        .expect(404);
      await invitee.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 1 })
        .expect(404);
      await app
        .get(DataSource)
        .query(
          'INSERT INTO project_members (project_id, member_id) VALUES (1, 2)',
        );
      await invitee.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 1 })
        .expect(404);
      expect(await invitationCount()).toBe(0);
    });

    it('rejects inviting oneself, an existing member or an unknown user', async () => {
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 1 })
        .expect(409);
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 999 })
        .expect(404);
      await app
        .get(DataSource)
        .query(
          'INSERT INTO project_members (project_id, member_id) VALUES (1, 2)',
        );
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 2 })
        .expect(409);
      expect(await invitationCount()).toBe(0);
    });

    it('returns one 201 and one 409 for concurrent duplicate requests', async () => {
      const responses = await Promise.all([
        owner.agent.post('/projects/1/invitations').send({ inviteeId: 2 }),
        owner.agent.post('/projects/1/invitations').send({ inviteeId: 2 }),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
      expect(await invitationCount()).toBe(1);
    });

    it('allows a new invitation alongside used history when no membership remains', async () => {
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 2 })
        .expect(201);
      // Arrange historical state only; this does not test acceptance or leaving.
      await app
        .get(DataSource)
        .query("UPDATE invitations SET status = 'accepted'");
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 2 })
        .expect(201);
      expect(
        await app
          .get(DataSource)
          .query('SELECT status FROM invitations ORDER BY id'),
      ).toEqual([{ status: 'accepted' }, { status: 'pending' }]);
    });

    it('returns a safe 503 on lock timeout and permits retry after release', async () => {
      const blocker = app.get(DataSource).createQueryRunner();
      await blocker.connect();
      await blocker.startTransaction();
      try {
        await blocker.query('SELECT id FROM projects WHERE id = 1 FOR UPDATE');
        const response = await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 2 })
          .expect(503);
        expect(response.body).toMatchObject({
          statusCode: 503,
          message: 'Internal server error',
        });
        expect(await invitationCount()).toBe(0);
      } finally {
        await blocker.rollbackTransaction();
        await blocker.release();
      }
      await owner.agent
        .post('/projects/1/invitations')
        .send({ inviteeId: 2 })
        .expect(201);
    });

    it('waits for the project lock and rechecks ownership after a concurrent change', async () => {
      const database = app.get(DataSource);
      const blocker = database.createQueryRunner();
      await blocker.connect();
      await blocker.startTransaction();
      let pending: Promise<request.Response> | undefined;
      try {
        const [{ pid }] = await blocker.query<Array<{ pid: number }>>(
          'SELECT pg_backend_pid() AS pid',
        );
        await blocker.query('SELECT id FROM projects WHERE id = 1 FOR UPDATE');
        await blocker.query('UPDATE projects SET owner_id = 2 WHERE id = 1');
        pending = owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 2 })
          .then((response) => response);
        let waiting = false;
        const deadline = Date.now() + 1200;
        while (!waiting && Date.now() < deadline) {
          const rows = await database.query<Array<{ waiting: boolean }>>(
            'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))) AS waiting',
            [pid],
          );
          waiting = rows[0].waiting;
          if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        await blocker.commitTransaction();
      } finally {
        if (blocker.isTransactionActive) await blocker.rollbackTransaction();
        await blocker.release();
        if (pending) await pending;
      }
      expect((await pending).status).toBe(404);
      expect(await invitationCount()).toBe(0);
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
