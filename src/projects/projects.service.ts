import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, ILike, Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';
import { Client } from '../clients/entities/client.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    const client = createProjectDto.clientId
      ? await this.findClientByIdOrFail(createProjectDto.clientId)
      : null;

    await this.ensureProjectNameIsUnique(createProjectDto.name, client?.id ?? null);

    const project = this.projectsRepository.create({
      name: createProjectDto.name,
      description: createProjectDto.description ?? null,
      startDate: createProjectDto.startDate ? new Date(createProjectDto.startDate) : null,
      endDate: createProjectDto.endDate ? new Date(createProjectDto.endDate) : null,
      status: createProjectDto.status ?? 'active',
      client,
    });

    return this.projectsRepository.save(project);
  }

  async findAll() {
    const projects = await this.projectsRepository.find({
      relations: {
        client: true,
        samples: true,
        reports: true,
      },
      order: { createdAt: 'DESC' },
    });

    return {
      message: projects.length ? 'Projects retrieved successfully' : 'No projects found',
      data: projects,
    };
  }

  async findOne(id: string, clientId?: string) {
    return this.getProjectDetail(id, clientId);
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.findProjectByIdOrFail(id);

    let client = project.client;
    if (Object.prototype.hasOwnProperty.call(updateProjectDto, 'clientId')) {
      client = updateProjectDto.clientId
        ? await this.findClientByIdOrFail(updateProjectDto.clientId)
        : null;
    }

    const nextName = updateProjectDto.name?.trim() || project.name;
    await this.ensureProjectNameIsUnique(nextName, client?.id ?? null, project.id);

    const merged = this.projectsRepository.merge(project, {
      ...updateProjectDto,
      startDate: updateProjectDto.startDate
        ? new Date(updateProjectDto.startDate)
        : project.startDate,
      endDate: updateProjectDto.endDate ? new Date(updateProjectDto.endDate) : project.endDate,
      client,
    });

    return this.projectsRepository.save(merged);
  }

  async remove(id: string) {
    const project = await this.findProjectByIdOrFail(id);
    await this.projectsRepository.remove(project);
    return { message: 'Project deleted successfully' };
  }

  async updateProjectStatus(id: string, status: string, clientId?: string) {
    if (!status?.trim()) {
      throw new BadRequestException('Project status is required');
    }

    const project = await this.findProjectByIdOrFail(id);
    this.validateProjectScope(project, clientId);

    project.status = status.trim().toLowerCase();
    return this.projectsRepository.save(project);
  }

  async findProjectsByClient(clientId: string) {
    await this.findClientByIdOrFail(clientId);

    const projects = await this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('project.samples', 'samples')
      .leftJoinAndSelect('project.reports', 'reports')
      .where('client.id = :clientId', { clientId })
      .orderBy('project.created_at', 'DESC')
      .getMany();

    return {
      message: projects.length ? 'Projects retrieved successfully' : 'No projects found',
      data: projects,
    };
  }

  async searchProjectsByName(name: string, clientId?: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Name query is required');
    }

    const normalizedName = name.trim();

    const whereClause = clientId
      ? {
          name: ILike(`%${normalizedName}%`),
          client: { id: clientId },
        }
      : {
          name: ILike(`%${normalizedName}%`),
        };

    if (clientId) {
      await this.findClientByIdOrFail(clientId);
    }

    const projects = await this.projectsRepository.find({
      where: whereClause,
      relations: {
        client: true,
        samples: true,
        reports: true,
      },
      order: { name: 'ASC' },
    });

    return {
      message: projects.length ? 'Projects found' : 'No projects found matching the provided name',
      data: projects,
    };
  }

  async filterProjectsByStatus(status: string, clientId?: string) {
    if (!status?.trim()) {
      throw new BadRequestException('Status filter is required');
    }

    if (clientId) {
      await this.findClientByIdOrFail(clientId);
    }

    const query = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('project.samples', 'samples')
      .leftJoinAndSelect('project.reports', 'reports')
      .where('LOWER(project.status) = LOWER(:status)', { status: status.trim() })
      .orderBy('project.created_at', 'DESC');

    if (clientId) {
      query.andWhere('client.id = :clientId', { clientId });
    }

    const projects = await query.getMany();

    return {
      message: projects.length ? 'Projects retrieved successfully' : 'No projects found',
      data: projects,
    };
  }

  async getProjectDetail(projectId: string, clientId?: string) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: {
        client: true,
        samples: {
          template: true,
          sampleFieldValues: {
            field: true,
          },
        },
        reports: {
          createdBy: true,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    this.validateProjectScope(project, clientId);

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      client: project.client,
      samples: project.samples,
      results: project.reports,
    };
  }

  async associateClientToProjects(clientId: string, projectIds: string[]) {
    if (!projectIds?.length) {
      throw new BadRequestException('At least one project ID is required');
    }

    const uniqueProjectIds = [...new Set(projectIds)];
    if (uniqueProjectIds.length !== projectIds.length) {
      throw new BadRequestException('Duplicate project IDs were provided');
    }

    const client = await this.findClientByIdOrFail(clientId);

    const projects = await this.projectsRepository.find({
      where: { id: In(uniqueProjectIds) },
      relations: { client: true },
    });

    if (projects.length !== uniqueProjectIds.length) {
      throw new NotFoundException('One or more projects were not found');
    }

    const alreadyAssociated = projects.filter((project) => project.client?.id === clientId);
    if (alreadyAssociated.length === projects.length) {
      throw new ConflictException('All projects are already associated with the selected client');
    }

    projects.forEach((project) => {
      project.client = client;
    });

    const updatedProjects = await this.projectsRepository.save(projects);

    return {
      message: 'Client associated to projects successfully',
      data: updatedProjects,
    };
  }

  async getAvailableStatuses(clientId?: string) {
    const query = this.projectsRepository
      .createQueryBuilder('project')
      .select('DISTINCT project.status', 'status')
      .where('project.status IS NOT NULL')
      .orderBy('project.status', 'ASC');

    if (clientId) {
      await this.findClientByIdOrFail(clientId);
      query.andWhere('project.client_id = :clientId', { clientId });
    }

    const rows = await query.getRawMany<{ status: string }>();
    return rows.map((row) => row.status);
  }

  private async findProjectByIdOrFail(projectId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: { client: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async findClientByIdOrFail(clientId: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({ where: { id: clientId } });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  private validateProjectScope(project: Project, clientId?: string): void {
    if (!clientId) {
      return;
    }

    if (!project.client || project.client.id !== clientId) {
      throw new NotFoundException('Project not found for the selected client');
    }
  }

  private async ensureProjectNameIsUnique(
    name: string,
    clientId: string | null,
    currentProjectId?: string,
  ): Promise<void> {
    const query = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoin('project.client', 'client')
      .where('LOWER(project.name) = LOWER(:name)', { name });

    if (clientId) {
      query.andWhere('client.id = :clientId', { clientId });
    } else {
      query.andWhere('project.client_id IS NULL');
    }

    if (currentProjectId) {
      query.andWhere('project.id != :currentProjectId', { currentProjectId });
    }

    const duplicate = await query.getOne();
    if (duplicate) {
      throw new ConflictException('A project with this name already exists for the selected client');
    }
  }
}
