import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessions1784448000000 implements MigrationInterface {
  name = 'CreateSessions1784448000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sessions" ("sid" character varying NOT NULL, "sess" json NOT NULL, "expire" TIMESTAMP(6) NOT NULL, CONSTRAINT "PK_sessions_sid" PRIMARY KEY ("sid"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_expire" ON "sessions" ("expire")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
  }
}
