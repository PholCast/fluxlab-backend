import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { SampleFieldValue } from './sample-field-value.entity';
import { Template } from './template.entity';

@Entity({
  name: 'samples',
})
@Unique('UQ_samples_project_code', ['project', 'code'])
@Unique('UQ_samples_project_customcode', ['project', 'customCode'])

export class Sample {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'code', type: 'varchar', length: 120 })
  code: string;

  @Column({ name: 'custom_code', type: 'varchar', length: 120, nullable: true })
  customCode: string | null;

  // @Column({ name: 'created_by', type: 'varchar', length: 120 })
  // createdBy: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'pending' })
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Template, (template) => template.samples, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @ManyToOne(() => Project, (project) => project.samples, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => SampleFieldValue, (sampleFieldValue) => sampleFieldValue.sample)
  sampleFieldValues: SampleFieldValue[];
}
