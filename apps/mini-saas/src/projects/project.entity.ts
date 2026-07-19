import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;
}
