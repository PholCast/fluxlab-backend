import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Field } from './field.entity';
import { Sample } from './sample.entity';

@Entity({
  name: 'templates',
})
export class Template {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Sample, (sample) => sample.template)
  samples: Sample[];

  @OneToMany(() => Field, (field) => field.template)
  fields: Field[];
}