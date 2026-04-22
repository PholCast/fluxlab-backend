import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssociateClientProjectsDto } from './dto/associate-client-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

const projectsServiceMock = {
  create: jest.fn(),
  associateClientToProjects: jest.fn(),
  searchProjectsByName: jest.fn(),
  filterProjectsByStatus: jest.fn(),
  getAvailableStatuses: jest.fn(),
  findProjectsByClient: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  updateProjectStatus: jest.fn(),
  remove: jest.fn(),
};

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: typeof projectsServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: projectsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const dto: CreateProjectDto = {
        name: 'QC Project',
        description: 'Validation workflow',
        startDate: '2026-03-01',
        endDate: '2026-06-30',
        status: 'active',
        clientId: 'client-1',
      };
      const expected = { id: 'project-1', ...dto };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('associateClientToProjects', () => {
    it('should call service.associateClientToProjects with clientId and projectIds', async () => {
      const dto: AssociateClientProjectsDto = {
        clientId: 'client-1',
        projectIds: ['project-1', 'project-2'],
      };
      const expected = { message: 'Client associated to projects successfully', data: [] };
      service.associateClientToProjects.mockResolvedValue(expected);

      const result = await controller.associateClientToProjects(dto);

      expect(service.associateClientToProjects).toHaveBeenCalledWith(
        dto.clientId,
        dto.projectIds,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('searchByName', () => {
    it('should call service.searchProjectsByName with name and clientId', async () => {
      const expected = { message: 'Projects found', data: [] };
      service.searchProjectsByName.mockResolvedValue(expected);

      const result = await controller.searchByName('QC', 'client-1');

      expect(service.searchProjectsByName).toHaveBeenCalledWith('QC', 'client-1');
      expect(result).toEqual(expected);
    });

    it('should pass undefined clientId when omitted', async () => {
      service.searchProjectsByName.mockResolvedValue({ message: 'Projects found', data: [] });

      await controller.searchByName('QC');

      expect(service.searchProjectsByName).toHaveBeenCalledWith('QC', undefined);
    });
  });

  describe('filterByStatus', () => {
    it('should call service.filterProjectsByStatus with value and clientId', async () => {
      const expected = { message: 'Projects retrieved successfully', data: [] };
      service.filterProjectsByStatus.mockResolvedValue(expected);

      const result = await controller.filterByStatus('active', 'client-1');

      expect(service.filterProjectsByStatus).toHaveBeenCalledWith('active', 'client-1');
      expect(result).toEqual(expected);
    });
  });

  describe('getAvailableStatuses', () => {
    it('should call service.getAvailableStatuses with clientId', async () => {
      service.getAvailableStatuses.mockResolvedValue(['active', 'completed']);

      const result = await controller.getAvailableStatuses('client-1');

      expect(service.getAvailableStatuses).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(['active', 'completed']);
    });
  });

  describe('findByClient', () => {
    it('should call service.findProjectsByClient with clientId', async () => {
      const expected = { message: 'Projects retrieved successfully', data: [] };
      service.findProjectsByClient.mockResolvedValue(expected);

      const result = await controller.findByClient('client-1');

      expect(service.findProjectsByClient).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      const expected = { message: 'Projects retrieved successfully', data: [] };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and clientId', async () => {
      const expected = { id: 'project-1', name: 'QC Project' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('project-1', 'client-1');

      expect(service.findOne).toHaveBeenCalledWith('project-1', 'client-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto: UpdateProjectDto = { name: 'QC Project Updated' };
      const expected = { id: 'project-1', name: 'QC Project Updated' };
      service.update.mockResolvedValue(expected);

      const result = await controller.update('project-1', dto);

      expect(service.update).toHaveBeenCalledWith('project-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('updateStatus', () => {
    it('should call service.updateProjectStatus with id, status and optional clientId', async () => {
      const dto: UpdateProjectStatusDto = { status: 'completed', clientId: 'client-1' };
      const expected = { id: 'project-1', status: 'completed' };
      service.updateProjectStatus.mockResolvedValue(expected);

      const result = await controller.updateStatus('project-1', dto);

      expect(service.updateProjectStatus).toHaveBeenCalledWith(
        'project-1',
        'completed',
        'client-1',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      const expected = { message: 'Project deleted successfully' };
      service.remove.mockResolvedValue(expected);

      const result = await controller.remove('project-1');

      expect(service.remove).toHaveBeenCalledWith('project-1');
      expect(result).toEqual(expected);
    });
  });
});
