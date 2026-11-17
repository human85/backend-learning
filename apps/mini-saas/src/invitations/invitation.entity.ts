import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';
import { UserEntity } from '../users/user.entity';

export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

@Entity({ name: 'invitations' })
@Check(
  'CHK_invitations_status',
  `"status" IN ('pending', 'accepted', 'rejected')`,
)
@Index('UQ_invitations_pending', ['projectId', 'inviteeId'], {
  unique: true,
  where: `"status" = 'pending'`,
})
@Index('IDX_invitations_project', ['projectId'])
@Index('IDX_invitations_inviter', ['inviterId'])
@Index('IDX_invitations_invitee', ['inviteeId'])
export class InvitationEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_invitations' })
  id: number;

  @Column({ name: 'project_id', type: 'integer' })
  projectId: number;

  @Column({ name: 'inviter_id', type: 'integer' })
  inviterId: number;

  @Column({ name: 'invitee_id', type: 'integer' })
  inviteeId: number;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: InvitationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ProjectEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'project_id',
    foreignKeyConstraintName: 'FK_invitations_project',
  })
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'inviter_id',
    foreignKeyConstraintName: 'FK_invitations_inviter',
  })
  inviter: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'invitee_id',
    foreignKeyConstraintName: 'FK_invitations_invitee',
  })
  invitee: UserEntity;
}
