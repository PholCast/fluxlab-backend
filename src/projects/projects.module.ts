import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { ProjectUser } from './entities/project-user.entity';
import { Report } from './entities/report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectUser, Report])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
