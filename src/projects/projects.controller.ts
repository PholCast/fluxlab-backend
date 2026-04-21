import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { AssociateClientProjectsDto } from './dto/associate-client-projects.dto';
import { FilterProjectsByDateRangeDto } from './dto/filter-projects-by-date-range.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Post('associate-client')
  associateClientToProjects(@Body() dto: AssociateClientProjectsDto) {
    return this.projectsService.associateClientToProjects(dto.clientId, dto.projectIds);
  }

  @Get('search')
  searchByName(@Query('name') name: string, @Query('clientId') clientId?: string) {
    return this.projectsService.searchProjectsByName(name, clientId);
  }

  @Get('status')
  filterByStatus(@Query('value') status: string, @Query('clientId') clientId?: string) {
    return this.projectsService.filterProjectsByStatus(status, clientId);
  }

  @Get('date-range')
  filterByDateRange(@Query() query: FilterProjectsByDateRangeDto) {
    return this.projectsService.filterProjectsByDateRange(
      query.fromDate,
      query.toDate,
      query.clientId,
    );
  }

  @Get('status/available')
  getAvailableStatuses(@Query('clientId') clientId?: string) {
    return this.projectsService.getAvailableStatuses(clientId);
  }

  @Get('client/:clientId')
  findByClient(@Param('clientId') clientId: string) {
    return this.projectsService.findProjectsByClient(clientId);
  }

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('clientId') clientId?: string) {
    return this.projectsService.findOne(id, clientId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProjectStatusDto) {
    return this.projectsService.updateProjectStatus(id, dto.status, dto.clientId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
