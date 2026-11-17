import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectCollaboration1794873600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "id" SERIAL CONSTRAINT "PK_project_members" PRIMARY KEY,
        "project_id" integer NOT NULL,
        "member_id" integer NOT NULL,
        CONSTRAINT "UQ_project_members_project_member" UNIQUE ("project_id", "member_id"),
        CONSTRAINT "FK_project_members_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_members_member" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_project_members_member" ON "project_members" ("member_id")
    `);
    await queryRunner.query(`
      CREATE TABLE "invitations" (
        "id" SERIAL CONSTRAINT "PK_invitations" PRIMARY KEY,
        "project_id" integer NOT NULL,
        "inviter_id" integer NOT NULL,
        "invitee_id" integer NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_invitations_status" CHECK ("status" IN ('pending', 'accepted', 'rejected')),
        CONSTRAINT "FK_invitations_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invitations_inviter" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_invitations_invitee" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_invitations_pending"
      ON "invitations" ("project_id", "invitee_id") WHERE "status" = 'pending'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_invitations_project" ON "invitations" ("project_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_invitations_inviter" ON "invitations" ("inviter_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_invitations_invitee" ON "invitations" ("invitee_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "invitations"');
    await queryRunner.query('DROP TABLE "project_members"');
  }
}
