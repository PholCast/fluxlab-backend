import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ProjectUser } from '../../projects/entities/project-user.entity';
import { Report } from '../../projects/entities/report.entity';

@Entity({
  name: 'users',
})
export class User {
  @PrimaryColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'email', type: 'varchar', length: 180, unique: true })
  email: string;


  @Column({ name: 'role', type: 'varchar', length: 50 })
  role: string;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'password_changed', type: 'boolean', default: false })
  passwordChanged: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => ProjectUser, (projectUser) => projectUser.user)
  projectUsers: ProjectUser[];

  @OneToMany(() => Report, (report) => report.createdBy)
  reports: Report[];
}
