import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SampleFieldValue } from './sample-field-value.entity';
import { Template } from './template.entity';

@Entity({
  name: 'fields',
})
export class Field {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'data_type', type: 'varchar', length: 40 })
  dataType: string;

  @Column({ name: 'required', type: 'boolean', default: false })
  required: boolean;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @ManyToOne(() => Template, (template) => template.fields, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @OneToMany(() => SampleFieldValue, (sampleFieldValue) => sampleFieldValue.field)
  sampleFieldValues: SampleFieldValue[];
}