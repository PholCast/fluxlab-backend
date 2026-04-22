import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const createProjectsRepositoryMock = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  merge: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createClientsRepositoryMock = () => ({
  findOne: jest.fn(),
});

const createQueryBuilderMock = () => ({
  select: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
  getMany: jest.fn(),
  getRawMany: jest.fn(),
});

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: ReturnType<typeof createProjectsRepositoryMock>;
  let clientsRepository: ReturnType<typeof createClientsRepositoryMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    projectsRepository = createProjectsRepositoryMock();
    clientsRepository = createClientsRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
        },
        {
          provide: getRepositoryToken(Client),
          useValue: clientsRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a project with linked client when clientId is provided', async () => {
      const dto: CreateProjectDto = {
        name: 'QC Project',
        description: 'Validation workflow',
        startDate: '2026-03-01',
        endDate: '2026-06-30',
        status: 'active',
        clientId: 'client-1',
      };
      const client = { id: 'client-1', name: 'Acme' };
      const savedProject = { id: 'project-1', name: dto.name, client };
      const uniquenessQb = createQueryBuilderMock();

      clientsRepository.findOne.mockResolvedValue(client);
      projectsRepository.createQueryBuilder.mockReturnValue(uniquenessQb);
      uniquenessQb.getOne.mockResolvedValue(null);
      projectsRepository.create.mockReturnValue(savedProject);
      projectsRepository.save.mockResolvedValue(savedProject);

      const result = await service.create(dto);

      expect(clientsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'client-1' },
      });
      expect(projectsRepository.create).toHaveBeenCalledWith({
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate as string),
        endDate: new Date(dto.endDate as string),
        status: dto.status,
        client,
      });
      expect(projectsRepository.save).toHaveBeenCalledWith(savedProject);
      expect(result).toEqual(savedProject);
    });

    it('should throw ConflictException when duplicated project name exists for same scope', async () => {
      const dto: CreateProjectDto = { name: 'QC Project' };
      const uniquenessQb = createQueryBuilderMock();

      projectsRepository.createQueryBuilder.mockReturnValue(uniquenessQb);
      uniquenessQb.getOne.mockResolvedValue({ id: 'project-duplicate' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(projectsRepository.create).not.toHaveBeenCalled();
      expect(projectsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when provided client does not exist', async () => {
      const dto: CreateProjectDto = { name: 'QC Project', clientId: 'missing-client' };

      clientsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(projectsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return projects with success message when projects exist', async () => {
      const projects = [{ id: 'project-1' }];
      projectsRepository.find.mockResolvedValue(projects);

      const result = await service.findAll();

      expect(projectsRepository.find).toHaveBeenCalledWith({
        relations: {
          client: true,
          samples: true,
          reports: true,
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        message: 'Projects retrieved successfully',
        data: projects,
      });
    });

    it('should return empty message when no projects exist', async () => {
      projectsRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual({
        message: 'No projects found',
        data: [],
      });
    });
  });

  describe('findOne', () => {
    it('should return mapped project detail', async () => {
      const project = {
        id: 'project-1',
        name: 'QC Project',
        description: 'desc',
        status: 'active',
        startDate: null,
        endDate: null,
        createdAt: new Date('2026-01-01'),
        client: { id: 'client-1' },
        samples: [{ id: 'sample-1' }],
        reports: [{ id: 'report-1' }],
      };
      projectsRepository.findOne.mockResolvedValue(project);

      const result = await service.findOne('project-1');

      expect(result).toEqual({
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
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-project')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when project is outside client scope', async () => {
      projectsRepository.findOne.mockResolvedValue({
        id: 'project-1',
        client: { id: 'client-2' },
        reports: [],
        samples: [],
      });

      await expect(service.findOne('project-1', 'client-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a project and keep existing client when clientId is not included', async () => {
      const existingProject = {
        id: 'project-1',
        name: 'QC Project',
        client: { id: 'client-1' },
        startDate: null,
        endDate: null,
      };
      const dto: UpdateProjectDto = { name: 'QC Project Updated', startDate: '2026-02-01' };
      const merged = { ...existingProject, ...dto, startDate: new Date(dto.startDate as string) };
      const uniquenessQb = createQueryBuilderMock();

      projectsRepository.findOne.mockResolvedValue(existingProject);
      projectsRepository.createQueryBuilder.mockReturnValue(uniquenessQb);
      uniquenessQb.getOne.mockResolvedValue(null);
      projectsRepository.merge.mockReturnValue(merged);
      projectsRepository.save.mockResolvedValue(merged);

      const result = await service.update(existingProject.id, dto);

      expect(projectsRepository.merge).toHaveBeenCalledWith(existingProject, {
        ...dto,
        startDate: new Date('2026-02-01'),
        endDate: existingProject.endDate,
        client: existingProject.client,
      });
      expect(result).toEqual(merged);
    });

    it('should throw ConflictException when updated name already exists for the scope', async () => {
      const existingProject = {
        id: 'project-1',
        name: 'QC Project',
        client: null,
        startDate: null,
        endDate: null,
      };
      const uniquenessQb = createQueryBuilderMock();

      projectsRepository.findOne.mockResolvedValue(existingProject);
      projectsRepository.createQueryBuilder.mockReturnValue(uniquenessQb);
      uniquenessQb.getOne.mockResolvedValue({ id: 'project-2' });

      await expect(service.update(existingProject.id, { name: 'QC Project' })).rejects.toThrow(
        ConflictException,
      );
      expect(projectsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when project to update does not exist', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(service.update('missing-project', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove project and return success message', async () => {
      const project = { id: 'project-1', client: null };
      projectsRepository.findOne.mockResolvedValue(project);

      const result = await service.remove('project-1');

      expect(projectsRepository.remove).toHaveBeenCalledWith(project);
      expect(result).toEqual({ message: 'Project deleted successfully' });
    });
  });

  describe('updateProjectStatus', () => {
    it('should throw BadRequestException when status is empty', async () => {
      await expect(service.updateProjectStatus('project-1', '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(projectsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should normalize and save project status', async () => {
      const project = { id: 'project-1', status: 'active', client: { id: 'client-1' } };
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.save.mockResolvedValue({ ...project, status: 'completed' });

      const result = await service.updateProjectStatus('project-1', ' Completed ', 'client-1');

      expect(projectsRepository.save).toHaveBeenCalledWith({
        ...project,
        status: 'completed',
      });
      expect(result).toEqual({ ...project, status: 'completed' });
    });
  });

  describe('findProjectsByClient', () => {
    it('should return client projects ordered by created date desc', async () => {
      const queryBuilder = createQueryBuilderMock();
      const projects = [{ id: 'project-1' }];

      clientsRepository.findOne.mockResolvedValue({ id: 'client-1' });
      projectsRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      queryBuilder.getMany.mockResolvedValue(projects);

      const result = await service.findProjectsByClient('client-1');

      expect(result).toEqual({
        message: 'Projects retrieved successfully',
        data: projects,
      });
    });
  });

  describe('searchProjectsByName', () => {
    it('should throw BadRequestException when name query is empty', async () => {
      await expect(service.searchProjectsByName('   ')).rejects.toThrow(BadRequestException);
      expect(projectsRepository.find).not.toHaveBeenCalled();
    });

    it('should search by name with client scope when clientId is provided', async () => {
      const projects = [{ id: 'project-1', name: 'QC Project' }];
      clientsRepository.findOne.mockResolvedValue({ id: 'client-1' });
      projectsRepository.find.mockResolvedValue(projects);

      const result = await service.searchProjectsByName('QC', 'client-1');

      expect(projectsRepository.find).toHaveBeenCalledWith({
        where: {
          name: expect.anything(),
          client: { id: 'client-1' },
        },
        relations: {
          client: true,
          samples: true,
          reports: true,
        },
        order: { name: 'ASC' },
      });
      expect(result).toEqual({
        message: 'Projects found',
        data: projects,
      });
    });
  });

  describe('filterProjectsByStatus', () => {
    it('should throw BadRequestException when status is empty', async () => {
      await expect(service.filterProjectsByStatus('')).rejects.toThrow(BadRequestException);
    });

    it('should filter by status and client when clientId is provided', async () => {
      const queryBuilder = createQueryBuilderMock();

      clientsRepository.findOne.mockResolvedValue({ id: 'client-1' });
      projectsRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      queryBuilder.getMany.mockResolvedValue([{ id: 'project-1' }]);

      const result = await service.filterProjectsByStatus('active', 'client-1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('client.id = :clientId', {
        clientId: 'client-1',
      });
      expect(result).toEqual({
        message: 'Projects retrieved successfully',
        data: [{ id: 'project-1' }],
      });
    });
  });

  describe('associateClientToProjects', () => {
    it('should throw BadRequestException when projectIds is empty', async () => {
      await expect(service.associateClientToProjects('client-1', [])).rejects.toThrow(
        BadRequestException,
      );
      expect(clientsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when duplicate project IDs are provided', async () => {
      await expect(
        service.associateClientToProjects('client-1', ['project-1', 'project-1']),
      ).rejects.toThrow(BadRequestException);
      expect(clientsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when one or more projects are missing', async () => {
      clientsRepository.findOne.mockResolvedValue({ id: 'client-1' });
      projectsRepository.find.mockResolvedValue([{ id: 'project-1', client: null }]);

      await expect(
        service.associateClientToProjects('client-1', ['project-1', 'project-2']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when all projects are already associated to the client', async () => {
      clientsRepository.findOne.mockResolvedValue({ id: 'client-1' });
      projectsRepository.find.mockResolvedValue([
        { id: 'project-1', client: { id: 'client-1' } },
        { id: 'project-2', client: { id: 'client-1' } },
      ]);

      await expect(
        service.associateClientToProjects('client-1', ['project-1', 'project-2']),
      ).rejects.toThrow(ConflictException);
    });

    it('should associate client to projects and persist changes', async () => {
      const client = { id: 'client-1', name: 'Acme' };
      const projects = [
        { id: 'project-1', client: null },
        { id: 'project-2', client: { id: 'client-2' } },
      ];
      const saved = projects.map((project) => ({ ...project, client }));

      clientsRepository.findOne.mockResolvedValue(client);
      projectsRepository.find.mockResolvedValue(projects);
      projectsRepository.save.mockResolvedValue(saved);

      const result = await service.associateClientToProjects('client-1', [
        'project-1',
        'project-2',
      ]);

      expect(projectsRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Client associated to projects successfully',
        data: saved,
      });
    });
  });

  describe('getAvailableStatuses', () => {
    it('should return distinct statuses', async () => {
      const queryBuilder = createQueryBuilderMock();
      projectsRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      queryBuilder.getRawMany.mockResolvedValue([{ status: 'active' }, { status: 'completed' }]);

      const result = await service.getAvailableStatuses();

      expect(result).toEqual(['active', 'completed']);
    });

    it('should validate client and filter statuses by client when clientId is provided', async () => {
      const queryBuilder = createQueryBuilderMock();
      clientsRepository.findOne.mockResolvedValue({ id: 'client-1' });
      projectsRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      queryBuilder.getRawMany.mockResolvedValue([{ status: 'active' }]);

      const result = await service.getAvailableStatuses('client-1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('project.client_id = :clientId', {
        clientId: 'client-1',
      });
      expect(result).toEqual(['active']);
    });
  });
});
