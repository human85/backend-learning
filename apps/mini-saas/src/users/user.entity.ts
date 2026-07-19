import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
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
}
