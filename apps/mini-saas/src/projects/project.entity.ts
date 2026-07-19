import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PROJECT_NAME_MAX_LENGTH } from './project.constants';

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: PROJECT_NAME_MAX_LENGTH })
  name: string;
}
