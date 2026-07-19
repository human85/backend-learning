import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';
import {
  PASSWORD_HASH_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
} from './user.constants';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: USER_EMAIL_MAX_LENGTH, unique: true })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: PASSWORD_HASH_MAX_LENGTH,
    select: false,
  })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ProjectEntity, (project) => project.owner)
  projects: ProjectEntity[];
}
