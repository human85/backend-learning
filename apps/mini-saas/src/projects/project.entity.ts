import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { PROJECT_NAME_MAX_LENGTH } from './project.constants';

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: PROJECT_NAME_MAX_LENGTH })
  name: string;

  @Column({ name: 'owner_id', type: 'integer' })
  ownerId: number;

  @ManyToOne(() => UserEntity, (user) => user.projects, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'owner_id' })
  owner: UserEntity;
}
