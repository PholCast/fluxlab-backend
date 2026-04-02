import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Field } from './field.entity';
import { Sample } from './sample.entity';

@Entity({
  name: 'sample_field_values',
})
@Unique(['sample', 'field'])
export class SampleFieldValue {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'value_text', type: 'varchar', length: 255, nullable: true })
  valueText: string | null;

  @Column({ name: 'value_number', type: 'int', nullable: true })
  valueNumber: number | null;

  @Column({ name: 'value_date', type: 'date', nullable: true })
  valueDate: Date | null;

  @Column({ name: 'value_boolean', type: 'boolean', nullable: true })
  valueBoolean: boolean | null;

  @ManyToOne(() => Sample, (sample) => sample.sampleFieldValues, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sample_id' })
  sample: Sample;

  @ManyToOne(() => Field, (field) => field.sampleFieldValues, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'field_id' })
  field: Field;
}
