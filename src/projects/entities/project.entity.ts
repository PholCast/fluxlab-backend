import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Sample } from '../../samples/entities/sample.entity';
import { ProjectUser } from './project-user.entity';
import { Report } from './report.entity';

@Entity({
  name: 'projects',
})
export class Project {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'active' })
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Client, (client) => client.projects, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  @OneToMany(() => Report, (report) => report.project)
  reports: Report[];

  @OneToMany(() => ProjectUser, (projectUser) => projectUser.project)
  projectUsers: ProjectUser[];

  @OneToMany(() => Sample, (sample) => sample.project)
  samples: Sample[];
}
