import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { ProjectEntity } from './project.entity';

@Entity({ name: 'project_members' })
@Unique('UQ_project_members_project_member', ['projectId', 'memberId'])
@Index('IDX_project_members_member', ['memberId'])
export class ProjectMemberEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_project_members' })
  id: number;

  @Column({ name: 'project_id', type: 'integer' })
  projectId: number;

  @Column({ name: 'member_id', type: 'integer' })
  memberId: number;

  @ManyToOne(() => ProjectEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'project_id',
    foreignKeyConstraintName: 'FK_project_members_project',
  })
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'member_id',
    foreignKeyConstraintName: 'FK_project_members_member',
  })
  member: UserEntity;
}
