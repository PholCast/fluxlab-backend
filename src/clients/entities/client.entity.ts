import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity({
  name: 'clients',
})
export class Client {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 150, unique: true })
  name: string;

  @Column({ name: 'email', type: 'varchar', length: 180, unique: true })
  email: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 40, nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'active' })
  status: string;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Project, (project) => project.client)
  projects: Project[];
}
