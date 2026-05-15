import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Client } from '../clients/entities/client.entity';
import { Project } from '../projects/entities/project.entity';
import { Report } from '../projects/entities/report.entity';
import { Sample } from '../samples/entities/sample.entity';
import { Template } from '../samples/entities/template.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      Project,
      Report,
      Sample,
      Template,
      User,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
