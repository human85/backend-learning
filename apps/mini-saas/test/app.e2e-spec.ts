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

    describe('project member read-only access', () => {
      beforeEach(async () => {
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 2 })
          .expect(201);
      });

      it('permits reads only after acceptance and lists owned plus joined projects', async () => {
        await invitee.agent.get('/projects/1').expect(404);
        await invitee.agent.get('/projects').expect(200).expect([]);
        await invitee.agent.post('/invitations/1/accept').expect(200);
        await invitee.agent
          .get('/projects/1')
          .expect(200)
          .expect({ id: 1, name: 'Invitation project', ownerId: 1 });
        await invitee.agent
          .post('/projects')
          .send({ name: 'My own project' })
          .expect(201);
        const list = await invitee.agent.get('/projects').expect(200);
        expect(list.body).toEqual([
          { id: 1, name: 'Invitation project', ownerId: 1 },
          { id: 2, name: 'My own project', ownerId: 2 },
        ]);
        await owner.agent
          .get('/projects')
          .expect(200)
          .expect([{ id: 1, name: 'Invitation project', ownerId: 1 }]);
      });

      it('does not grant management permissions to a member who can read', async () => {
        await invitee.agent.post('/invitations/1/accept').expect(200);
        await invitee.agent.get('/projects/1').expect(200);
        await invitee.agent
          .patch('/projects/1')
          .send({ name: 'Unauthorized change' })
          .expect(404);
        await invitee.agent.delete('/projects/1').expect(404);
        await invitee.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 1 })
          .expect(404);
        await owner.agent
          .get('/projects/1')
          .expect(200)
          .expect({ id: 1, name: 'Invitation project', ownerId: 1 });
        await owner.agent
          .patch('/projects/1')
          .send({ name: 'Owner change' })
          .expect(200);
        await invitee.agent
          .get('/projects/1')
          .expect(200)
          .expect({ id: 1, name: 'Owner change', ownerId: 1 });
      });

      it('rejects a rename when ownership changes between lookup and UPDATE', async () => {
        const database = app.get(DataSource);
        const blocker = database.createQueryRunner();
        await blocker.connect();
        await blocker.startTransaction();
        let pending: Promise<request.Response> | undefined;
        try {
          const [{ pid }] = await blocker.query<Array<{ pid: number }>>(
            'SELECT pg_backend_pid() AS pid',
          );
          await blocker.query('UPDATE projects SET owner_id = 2 WHERE id = 1');
          pending = owner.agent
            .patch('/projects/1')
            .send({ name: 'Stale owner change' })
            .then((response) => response);
          let waiting = false;
          const deadline = Date.now() + 1200;
          while (!waiting && Date.now() < deadline) {
            const rows = await database.query<Array<{ waiting: boolean }>>(
              'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))) AS waiting',
              [pid],
            );
            waiting = rows[0].waiting;
            if (!waiting)
              await new Promise((resolve) => setTimeout(resolve, 10));
          }
          expect(waiting).toBe(true);
          await blocker.commitTransaction();
        } finally {
          if (blocker.isTransactionActive) await blocker.rollbackTransaction();
          await blocker.release();
          if (pending) await pending;
        }
        expect((await pending).status).toBe(404);
        expect(
          await database.query(
            'SELECT owner_id, name FROM projects WHERE id = 1',
          ),
        ).toEqual([{ owner_id: 2, name: 'Invitation project' }]);
      });

      it('checks membership for the requested project and user rather than any membership', async () => {
        const stranger = await createAuthenticatedClient(
          'stranger@example.com',
        );
        await invitee.agent.post('/invitations/1/accept').expect(200);
        await owner.agent
          .post('/projects')
          .send({ name: 'Private project' })
          .expect(201);
        await invitee.agent.get('/projects/2').expect(404);
        await stranger.agent.get('/projects/1').expect(404);
        await stranger.agent.get('/projects').expect(200).expect([]);
        expect((await invitee.agent.get('/projects').expect(200)).body).toEqual(
          [{ id: 1, name: 'Invitation project', ownerId: 1 }],
        );
      });

      it('removes read access when the member relation is deleted, regardless of invitation history', async () => {
        await invitee.agent.post('/invitations/1/accept').expect(200);
        await invitee.agent.get('/projects/1').expect(200);
        // Arrange a leave result; the leave endpoint is still a later slice.
        await app
          .get(DataSource)
          .query(
            'DELETE FROM project_members WHERE project_id = 1 AND member_id = 2',
          );
        await invitee.agent.get('/projects/1').expect(404);
        await invitee.agent.get('/projects').expect(200).expect([]);
        expect(
          await app.get(DataSource).query('SELECT status FROM invitations'),
        ).toEqual([{ status: 'accepted' }]);
      });
    });

    describe('transferring ownership and leaving a project', () => {
      beforeEach(async () => {
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 2 })
          .expect(201);
        await invitee.agent.post('/invitations/1/accept').expect(200);
      });

      async function membershipIds() {
        return app
          .get(DataSource)
          .query<Array<{ member_id: number }>>(
            'SELECT member_id FROM project_members WHERE project_id = 1 ORDER BY member_id',
          );
      }

      it('atomically swaps roles, preserves other members and changes management permissions', async () => {
        const third = await createAuthenticatedClient(
          'other-member@example.com',
        );
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 3 })
          .expect(201);
        await third.agent.post('/invitations/2/accept').expect(200);
        await owner.agent
          .post('/projects/1/transfer')
          .send({ memberId: 2 })
          .expect(204);
        expect(await membershipIds()).toEqual([
          { member_id: 1 },
          { member_id: 3 },
        ]);
        await owner.agent
          .get('/projects/1')
          .expect(200)
          .expect({ id: 1, name: 'Invitation project', ownerId: 2 });
        await owner.agent
          .patch('/projects/1')
          .send({ name: 'Old owner write' })
          .expect(404);
        await owner.agent.delete('/projects/1').expect(404);
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 3 })
          .expect(404);
        await invitee.agent
          .patch('/projects/1')
          .send({ name: 'New owner write' })
          .expect(200);
      });

      it('requires transfer before the owner can leave, then removes only their membership', async () => {
        await owner.agent.delete('/projects/1/members/me').expect(409);
        await owner.agent
          .post('/projects/1/transfer')
          .send({ memberId: 2 })
          .expect(204);
        await owner.agent.delete('/projects/1/members/me').expect(204);
        await owner.agent.get('/projects/1').expect(404);
        await owner.agent.get('/projects').expect(200).expect([]);
        await owner.agent.delete('/projects/1/members/me').expect(404);
        await invitee.agent.delete('/projects/1/members/me').expect(409);
        await invitee.agent.get('/projects/1').expect(200);
        expect(await membershipIds()).toEqual([]);
      });

      it('rejects unauthorized transfers, self transfer, non-members and spoofed input', async () => {
        await request(app.getHttpServer())
          .post('/projects/1/transfer')
          .send({ memberId: 2 })
          .expect(401);
        await request(app.getHttpServer())
          .delete('/projects/1/members/me')
          .expect(401);
        await invitee.agent
          .post('/projects/1/transfer')
          .send({ memberId: 1 })
          .expect(404);
        await owner.agent
          .post('/projects/999/transfer')
          .send({ memberId: 2 })
          .expect(404);
        await owner.agent
          .post('/projects/1/transfer')
          .send({ memberId: 1 })
          .expect(409);
        await owner.agent
          .post('/projects/1/transfer')
          .send({ memberId: 999 })
          .expect(409);
        for (const body of [
          {},
          { memberId: '2' },
          { memberId: 0 },
          { memberId: 2147483648 },
          { memberId: 2, ownerId: 2 },
        ]) {
          await owner.agent.post('/projects/1/transfer').send(body).expect(400);
        }
        for (const id of ['abc', '0', '-1', '2147483648']) {
          await owner.agent
            .post(`/projects/${id}/transfer`)
            .send({ memberId: 2 })
            .expect(400);
          await invitee.agent.delete(`/projects/${id}/members/me`).expect(400);
        }
        await owner.agent
          .post('/projects/1/transfer?ownerId=2')
          .send({ memberId: 2 })
          .expect(400);
        await invitee.agent
          .delete('/projects/1/members/me')
          .send({ memberId: 1 })
          .expect(400);
        await invitee.agent
          .delete('/projects/1/members/me?memberId=1')
          .expect(400);
        expect(await membershipIds()).toEqual([{ member_id: 2 }]);
        expect(
          await app.get(DataSource).query('SELECT owner_id FROM projects'),
        ).toEqual([{ owner_id: 1 }]);
      });

      it('does not treat membership of another project as eligibility to transfer or leave', async () => {
        const other = await createAuthenticatedClient(
          'other-project-member@example.com',
        );
        await owner.agent
          .post('/projects')
          .send({ name: 'Another project' })
          .expect(201);
        await owner.agent
          .post('/projects/2/invitations')
          .send({ inviteeId: 3 })
          .expect(201);
        await other.agent.post('/invitations/2/accept').expect(200);
        await owner.agent
          .post('/projects/1/transfer')
          .send({ memberId: 3 })
          .expect(409);
        await other.agent.delete('/projects/1/members/me').expect(404);
        await other.agent.delete('/projects/999/members/me').expect(404);
        await other.agent.get('/projects/2').expect(200);
        expect(await membershipIds()).toEqual([{ member_id: 2 }]);
      });

      it('lets a member leave without deleting the project or invitation history', async () => {
        await invitee.agent.delete('/projects/1/members/me').expect(204);
        await invitee.agent.get('/projects/1').expect(404);
        await invitee.agent.post('/invitations/1/accept').expect(409);
        await invitee.agent.delete('/projects/1/members/me').expect(404);
        await owner.agent.get('/projects/1').expect(200);
        expect(
          await app.get(DataSource).query('SELECT status FROM invitations'),
        ).toEqual([{ status: 'accepted' }]);
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 2 })
          .expect(201);
        await invitee.agent.post('/invitations/2/accept').expect(200);
        await invitee.agent.get('/projects/1').expect(200);
      });

      it('allows only one of two concurrent transfers from the same owner', async () => {
        const third = await createAuthenticatedClient(
          'second-target@example.com',
        );
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 3 })
          .expect(201);
        await third.agent.post('/invitations/2/accept').expect(200);
        const results = await Promise.all([
          owner.agent.post('/projects/1/transfer').send({ memberId: 2 }),
          owner.agent.post('/projects/1/transfer').send({ memberId: 3 }),
        ]);
        expect(results.map(({ status }) => status).sort()).toEqual([204, 404]);
        const winner = results[0].status === 204 ? 2 : 3;
        expect(
          await app.get(DataSource).query('SELECT owner_id FROM projects'),
        ).toEqual([{ owner_id: winner }]);
        expect(await membershipIds()).toEqual([
          { member_id: 1 },
          { member_id: winner === 2 ? 3 : 2 },
        ]);
      });

      it('rolls back owner change and member deletion if adding the former owner fails', async () => {
        const database = app.get(DataSource);
        await database.query(`
          CREATE FUNCTION test_fail_former_owner() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'simulated former owner write failure'; END; $$;
          CREATE TRIGGER test_fail_former_owner BEFORE INSERT ON project_members
          FOR EACH ROW WHEN (NEW.member_id = 1) EXECUTE FUNCTION test_fail_former_owner();
        `);
        try {
          await owner.agent
            .post('/projects/1/transfer')
            .send({ memberId: 2 })
            .expect(500);
          expect(await database.query('SELECT owner_id FROM projects')).toEqual(
            [{ owner_id: 1 }],
          );
          expect(await membershipIds()).toEqual([{ member_id: 2 }]);
        } finally {
          await database.query(
            'DROP TRIGGER test_fail_former_owner ON project_members',
          );
          await database.query('DROP FUNCTION test_fail_former_owner()');
        }
        await owner.agent
          .post('/projects/1/transfer')
          .send({ memberId: 2 })
          .expect(204);
      });

      it('keeps earlier pending invitations valid after a real transfer', async () => {
        const third = await createAuthenticatedClient(
          'pending-after-transfer@example.com',
        );
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 3 })
          .expect(201);
        await owner.agent
          .post('/projects/1/transfer')
          .send({ memberId: 2 })
          .expect(204);
        const accepted = await third.agent
          .post('/invitations/2/accept')
          .expect(200);
        expect(accepted.body).toMatchObject({
          inviterId: 1,
          inviteeId: 3,
          status: 'accepted',
        });
        expect(await membershipIds()).toEqual([
          { member_id: 1 },
          { member_id: 3 },
        ]);
      });

      it.each(['transfer-first', 'leave-first'])(
        'serializes target departure with transfer: %s',
        async (order) => {
          const database = app.get(DataSource);
          const blocker = database.createQueryRunner();
          await blocker.connect();
          await blocker.startTransaction();
          const requests: Array<Promise<request.Response>> = [];
          async function waitForQueue(size: number) {
            const deadline = Date.now() + 750;
            while (Date.now() < deadline) {
              const rows = await database.query<Array<{ waiting: number }>>(
                "SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND query LIKE '%FOR UPDATE%'",
              );
              if (rows[0].waiting >= size) return;
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
            throw new Error('Expected project lock queue did not form');
          }
          const transfer = () =>
            owner.agent
              .post('/projects/1/transfer')
              .send({ memberId: 2 })
              .then((response) => response);
          const leave = () =>
            invitee.agent
              .delete('/projects/1/members/me')
              .then((response) => response);
          try {
            await blocker.query(
              'SELECT id FROM projects WHERE id = 1 FOR UPDATE',
            );
            requests.push(order === 'transfer-first' ? transfer() : leave());
            await waitForQueue(1);
            requests.push(order === 'transfer-first' ? leave() : transfer());
            await waitForQueue(2);
            await blocker.commitTransaction();
          } finally {
            if (blocker.isTransactionActive)
              await blocker.rollbackTransaction();
            await blocker.release();
            await Promise.allSettled(requests);
          }
          const responses = await Promise.all(requests);
          expect(responses.map(({ status }) => status)).toEqual([204, 409]);
          const expectedOwner = order === 'transfer-first' ? 2 : 1;
          expect(await database.query('SELECT owner_id FROM projects')).toEqual(
            [{ owner_id: expectedOwner }],
          );
          expect(await membershipIds()).toEqual(
            order === 'transfer-first' ? [{ member_id: 1 }] : [],
          );
        },
      );
    });

    describe('rejecting a received invitation', () => {
      beforeEach(async () => {
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 2 })
          .expect(201);
      });

      it('rejects pending without membership and allows a new invitation with history retained', async () => {
        const response = await invitee.agent
          .post('/invitations/1/reject')
          .expect(204);
        expect(response.text).toBe('');
        expect(
          (await invitee.agent.get('/invitations').expect(200)).body,
        ).toMatchObject([{ id: 1, status: 'rejected' }]);
        expect(
          await app.get(DataSource).query('SELECT * FROM project_members'),
        ).toEqual([]);
        await invitee.agent.get('/projects/1').expect(404);
        await invitee.agent.post('/invitations/1/accept').expect(409);
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 2 })
          .expect(201);
        expect(
          await app
            .get(DataSource)
            .query('SELECT status FROM invitations ORDER BY id'),
        ).toEqual([{ status: 'rejected' }, { status: 'pending' }]);
      });

      it('rejects unauthenticated, wrong-recipient, missing and malformed requests without changing state', async () => {
        await request(app.getHttpServer())
          .post('/invitations/1/reject')
          .expect(401);
        await owner.agent.post('/invitations/1/reject').expect(404);
        await invitee.agent.post('/invitations/999/reject').expect(404);
        for (const id of ['abc', '0', '-1', '2147483648']) {
          await invitee.agent.post(`/invitations/${id}/reject`).expect(400);
        }
        await invitee.agent
          .post('/invitations/1/reject')
          .send({ userId: 1 })
          .expect(400);
        await invitee.agent
          .post('/invitations/1/reject')
          .send({ status: 'rejected' })
          .expect(400);
        await invitee.agent
          .post('/invitations/1/reject?inviteeId=1')
          .expect(400);
        expect(
          await app.get(DataSource).query('SELECT status FROM invitations'),
        ).toEqual([{ status: 'pending' }]);
      });

      it('returns conflict on repeat rejection or an accepted invitation without removing members', async () => {
        await invitee.agent.post('/invitations/1/reject').expect(204);
        await invitee.agent.post('/invitations/1/reject').expect(409);
        await owner.agent
          .post('/projects/1/invitations')
          .send({ inviteeId: 2 })
          .expect(201);
        await invitee.agent.post('/invitations/2/accept').expect(200);
        await invitee.agent.post('/invitations/2/reject').expect(409);
        await invitee.agent.get('/projects/1').expect(200);
        expect(
          await app
            .get(DataSource)
            .query('SELECT project_id, member_id FROM project_members'),
        ).toEqual([{ project_id: 1, member_id: 2 }]);
        expect(
          await app
            .get(DataSource)
            .query('SELECT status FROM invitations ORDER BY id'),
        ).toEqual([{ status: 'rejected' }, { status: 'accepted' }]);
      });

      it('serializes concurrent accept and reject so only one transition succeeds', async () => {
        const [accepted, rejected] = await Promise.all([
          invitee.agent.post('/invitations/1/accept'),
          invitee.agent.post('/invitations/1/reject'),
        ]);
        const rows = await app
          .get(DataSource)
          .query<Array<{ status: string }>>('SELECT status FROM invitations');
        const members = await app
          .get(DataSource)
          .query<Array<{ member_id: number }>>(
            'SELECT member_id FROM project_members',
          );
        if (rows[0].status === 'accepted') {
          expect([accepted.status, rejected.status]).toEqual([200, 409]);
          expect(members).toEqual([{ member_id: 2 }]);
        } else {
          expect(rows[0].status).toBe('rejected');
          expect([accepted.status, rejected.status]).toEqual([409, 204]);
          expect(members).toEqual([]);
        }
      });

      it('permits only one concurrent rejection', async () => {
        const responses = await Promise.all([
          invitee.agent.post('/invitations/1/reject'),
          invitee.agent.post('/invitations/1/reject'),
        ]);
        expect(responses.map(({ status }) => status).sort()).toEqual([
          204, 409,
        ]);
        expect(
          await app.get(DataSource).query('SELECT status FROM invitations'),
        ).toEqual([{ status: 'rejected' }]);
        expect(
          await app.get(DataSource).query('SELECT * FROM project_members'),
        ).toEqual([]);
      });

      it('keeps pending on database write failure and allows rejection after recovery', async () => {
        const database = app.get(DataSource);
        await database.query(`
          CREATE FUNCTION test_reject_invitation_write() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'simulated rejection write failure'; END; $$;
          CREATE TRIGGER test_reject_invitation_write BEFORE UPDATE ON invitations
          FOR EACH ROW WHEN (NEW.status = 'rejected') EXECUTE FUNCTION test_reject_invitation_write();
        `);
        try {
          await invitee.agent.post('/invitations/1/reject').expect(500);
          expect(
            await database.query('SELECT status FROM invitations'),
          ).toEqual([{ status: 'pending' }]);
          expect(await database.query('SELECT * FROM project_members')).toEqual(
            [],
          );
        } finally {
          await database.query(
            'DROP TRIGGER test_reject_invitation_write ON invitations',
          );
          await database.query('DROP FUNCTION test_reject_invitation_write()');
        }
        await invitee.agent.post('/invitations/1/reject').expect(204);
      });
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
