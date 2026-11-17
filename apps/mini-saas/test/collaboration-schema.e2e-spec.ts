import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from '../src/database/database-options';
import { InvitationEntity } from '../src/invitations/invitation.entity';
import { ProjectMemberEntity } from '../src/projects/project-member.entity';

// Never migrate or clear the supplied database. Use its local server only to
// create a fresh, uniquely named database, then drop that database after testing.
const baseUrl =
  process.env.DATABASE_URL ??
  (existsSync('.env.test.local')
    ? parse(readFileSync('.env.test.local')).DATABASE_URL
    : undefined);
if (!baseUrl) throw new Error('DATABASE_URL is required for schema tests');
const target = new URL(baseUrl);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  target.pathname !== '/mini_saas_test'
) {
  throw new Error('Schema tests require a local mini_saas_test configuration');
}
const databaseName = `mini_saas_schema_test_${process.pid}_${Date.now()}`;
const adminUrl = new URL(target);
adminUrl.pathname = '/postgres';
const isolatedUrl = new URL(target);
isolatedUrl.pathname = `/${databaseName}`;

describe('Project collaboration schema on isolated PostgreSQL', () => {
  const admin = new Client({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: 3000,
  });
  const database = new DataSource(
    createDatabaseOptions(isolatedUrl.toString()),
  );
  let created = false;

  beforeAll(async () => {
    await admin.connect();
    // databaseName is generated above, never supplied by a user or environment.
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    await database.initialize();
    await database.runMigrations();
  });

  afterAll(async () => {
    try {
      if (database.isInitialized) await database.destroy();
    } finally {
      try {
        if (created) await admin.query(`DROP DATABASE "${databaseName}"`);
      } finally {
        await admin.end();
      }
    }
  });

  beforeEach(async () => {
    await database.query(
      'TRUNCATE "projects", "users", "sessions" RESTART IDENTITY CASCADE',
    );
    await database.query(`
      INSERT INTO users (email, password_hash) VALUES
        ('owner@schema.test', 'fixture-only'),
        ('member@schema.test', 'fixture-only'),
        ('other@schema.test', 'fixture-only');
      INSERT INTO projects (name, owner_id) VALUES ('A', 1), ('B', 1);
    `);
  });

  it('runs migrations once and keeps existing project writes compatible', async () => {
    expect(await database.runMigrations()).toEqual([]);
    const projects = await database.query<Array<{ name: string }>>(
      'SELECT name FROM projects ORDER BY id',
    );
    expect(projects).toEqual([{ name: 'A' }, { name: 'B' }]);
  });

  it('rejects duplicate membership while allowing both many-to-many directions', async () => {
    const members = database.getRepository(ProjectMemberEntity);
    await members.insert([
      { projectId: 1, memberId: 2 },
      { projectId: 1, memberId: 3 },
      { projectId: 2, memberId: 2 },
    ]);
    await expect(
      members.insert({ projectId: 1, memberId: 2 }),
    ).rejects.toMatchObject({
      driverError: {
        code: '23505',
        constraint: 'UQ_project_members_project_member',
      },
    });
    expect(await members.count()).toBe(3);
  });

  it('permits invitation history but only one pending invitation per target', async () => {
    const invitations = database.getRepository(InvitationEntity);
    const first = await invitations.save({
      projectId: 1,
      inviterId: 1,
      inviteeId: 2,
    });
    expect(first.status).toBe('pending');
    expect(first.createdAt).toBeInstanceOf(Date);
    await expect(
      invitations.insert({ projectId: 1, inviterId: 3, inviteeId: 2 }),
    ).rejects.toMatchObject({
      driverError: { code: '23505', constraint: 'UQ_invitations_pending' },
    });
    await invitations.update(first.id, { status: 'accepted' });
    const second = await invitations.save({
      projectId: 1,
      inviterId: 1,
      inviteeId: 2,
    });
    await invitations.update(second.id, { status: 'rejected' });
    await invitations.insert({ projectId: 1, inviterId: 1, inviteeId: 2 });
    const records = await invitations.find({ order: { id: 'ASC' } });
    expect(records.map((record) => record.status)).toEqual([
      'accepted',
      'rejected',
      'pending',
    ]);
  });

  it('rejects one of two concurrent pending inserts at the database boundary', async () => {
    const invitations = database.getRepository(InvitationEntity);
    const results = await Promise.allSettled([
      invitations.insert({ projectId: 1, inviterId: 1, inviteeId: 2 }),
      invitations.insert({ projectId: 1, inviterId: 1, inviteeId: 2 }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      reason: {
        driverError: { code: '23505', constraint: 'UQ_invitations_pending' },
      },
    });
    expect(await invitations.count()).toBe(1);
  });

  it('rejects missing references, required fields and invalid states', async () => {
    const invalidWrites = [
      [
        'INSERT INTO project_members (project_id, member_id) VALUES (999, 2)',
        '23503',
      ],
      [
        'INSERT INTO project_members (project_id, member_id) VALUES (1, 999)',
        '23503',
      ],
      ['INSERT INTO project_members (project_id) VALUES (1)', '23502'],
      [
        'INSERT INTO invitations (project_id, inviter_id, invitee_id) VALUES (999, 1, 2)',
        '23503',
      ],
      [
        'INSERT INTO invitations (project_id, inviter_id, invitee_id) VALUES (1, 999, 2)',
        '23503',
      ],
      [
        'INSERT INTO invitations (project_id, inviter_id, invitee_id) VALUES (1, 1, 999)',
        '23503',
      ],
      [
        'INSERT INTO invitations (project_id, inviter_id) VALUES (1, 1)',
        '23502',
      ],
      [
        "INSERT INTO invitations (project_id, inviter_id, invitee_id, status) VALUES (1, 1, 2, 'unknown')",
        '23514',
      ],
      [
        'INSERT INTO invitations (project_id, inviter_id, invitee_id, status) VALUES (1, 1, 2, NULL)',
        '23502',
      ],
    ];
    for (const [sql, code] of invalidWrites) {
      await expect(database.query(sql)).rejects.toMatchObject({
        driverError: { code },
      });
    }
  });

  it('prevents deleting users referenced by members or invitation history', async () => {
    await database.query(
      'INSERT INTO project_members (project_id, member_id) VALUES (1, 2)',
    );
    await expect(
      database.query('DELETE FROM users WHERE id = 2'),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
    await database.query('DELETE FROM project_members');
    await database.query(`
      INSERT INTO invitations (project_id, inviter_id, invitee_id, status)
      VALUES (1, 3, 2, 'accepted')
    `);
    for (const userId of [2, 3]) {
      await expect(
        database.query('DELETE FROM users WHERE id = $1', [userId]),
      ).rejects.toMatchObject({ driverError: { code: '23503' } });
    }
  });

  it('deletes only the deleted project relationships, preserving users', async () => {
    await database.query(`
      INSERT INTO project_members (project_id, member_id) VALUES (1, 2), (2, 2);
      INSERT INTO invitations (project_id, inviter_id, invitee_id)
      VALUES (1, 1, 3), (2, 1, 3);
      DELETE FROM projects WHERE id = 1;
    `);
    expect(
      await database.getRepository(ProjectMemberEntity).find(),
    ).toMatchObject([{ projectId: 2, memberId: 2 }]);
    expect(await database.getRepository(InvitationEntity).find()).toMatchObject(
      [{ projectId: 2, inviteeId: 3 }],
    );
    expect(
      await database.query<Array<{ count: number }>>(
        'SELECT count(*)::int AS count FROM users',
      ),
    ).toEqual([{ count: 3 }]);
  });

  it('keeps new entity metadata aligned with the migrated schema', async () => {
    const changes = await database.driver.createSchemaBuilder().log();
    expect(
      changes.upQueries.filter((query) =>
        /"(?:project_members|invitations)"/.test(query.query),
      ),
    ).toEqual([]);
  });

  it('can undo and reapply the new migration without changing existing projects', async () => {
    await database.undoLastMigration();
    expect(
      await database.query<
        Array<{ members: string | null; invitations: string | null }>
      >(
        "SELECT to_regclass('public.project_members') AS members, to_regclass('public.invitations') AS invitations",
      ),
    ).toEqual([{ members: null, invitations: null }]);
    expect(
      await database.query<Array<{ count: number }>>(
        'SELECT count(*)::int AS count FROM projects',
      ),
    ).toEqual([{ count: 2 }]);
    expect(await database.runMigrations()).toHaveLength(1);
  });
});
