import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SamplesService } from './services/samples.service';
import { Project } from '../projects/entities/project.entity';
import { Sample } from './entities/sample.entity';
import { Template } from './entities/template.entity';
import { SampleFieldValue } from './entities/sample-field-value.entity';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';
import { CreateSampleWithValuesDto } from './dto/create-sample-with-values.dto';

const createQueryBuilderMock = () => ({
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
  getMany: jest.fn(),
});

const createSampleRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
  manager: {
    transaction: jest.fn(),
  },
});

const createTemplateRepositoryMock = () => ({
  findOne: jest.fn(),
});

const createProjectRepositoryMock = () => ({
  findOne: jest.fn(),
});

describe('SamplesService', () => {
  let service: SamplesService;
  let sampleRepository: ReturnType<typeof createSampleRepositoryMock>;
  let templateRepository: ReturnType<typeof createTemplateRepositoryMock>;
  let projectRepository: ReturnType<typeof createProjectRepositoryMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    sampleRepository = createSampleRepositoryMock();
    templateRepository = createTemplateRepositoryMock();
    projectRepository = createProjectRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SamplesService,
        { provide: getRepositoryToken(Sample), useValue: sampleRepository },
        { provide: getRepositoryToken(Template), useValue: templateRepository },
        { provide: getRepositoryToken(Project), useValue: projectRepository },
      ],
    }).compile();

    service = module.get<SamplesService>(SamplesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a sample and return detailed entity from findOne', async () => {
      const dto: CreateSampleDto = {
        code: 'SMP-2026-0001',
        templateId: 'template-1',
        projectId: 'project-1',
        status: 'pending',
      };
      const template = { id: 'template-1', fields: [] };
      const project = { id: 'project-1' };
      const saved = { id: 'sample-1' };
      const detailed = { id: 'sample-1', code: dto.code };
      const uniqueQueryBuilder = createQueryBuilderMock();
      const findOneQueryBuilder = createQueryBuilderMock();

      templateRepository.findOne.mockResolvedValue(template);
      projectRepository.findOne.mockResolvedValue(project);
      sampleRepository.createQueryBuilder
        .mockReturnValueOnce(uniqueQueryBuilder)
        .mockReturnValueOnce(findOneQueryBuilder);
      uniqueQueryBuilder.getOne.mockResolvedValue(null);
      sampleRepository.create.mockReturnValue(saved);
      sampleRepository.save.mockResolvedValue(saved);
      findOneQueryBuilder.getOne.mockResolvedValue(detailed);

      const result = await service.create(dto);

      expect(sampleRepository.create).toHaveBeenCalledWith({
        code: dto.code,
        status: dto.status,
        template,
        project,
      });
      expect(result).toEqual(detailed);
    });

    it('should throw ConflictException when code already exists in same project', async () => {
      const dto: CreateSampleDto = {
        code: 'SMP-2026-0001',
        templateId: 'template-1',
        projectId: 'project-1',
      };
      const uniqueQueryBuilder = createQueryBuilderMock();

      templateRepository.findOne.mockResolvedValue({ id: 'template-1', fields: [] });
      projectRepository.findOne.mockResolvedValue({ id: 'project-1' });
      sampleRepository.createQueryBuilder.mockReturnValue(uniqueQueryBuilder);
      uniqueQueryBuilder.getOne.mockResolvedValue({ id: 'existing-sample' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(sampleRepository.create).not.toHaveBeenCalled();
      expect(sampleRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when template does not exist', async () => {
      const dto: CreateSampleDto = {
        code: 'SMP-2026-0001',
        templateId: 'missing-template',
        projectId: 'project-1',
      };

      templateRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return ordered sample list with relations', async () => {
      const samples = [{ id: 'sample-1' }];
      sampleRepository.find.mockResolvedValue(samples);

      const result = await service.findAll();

      expect(sampleRepository.find).toHaveBeenCalledWith({
        relations: {
          template: true,
          project: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
      expect(result).toEqual(samples);
    });
  });

  describe('findRepository', () => {
    it('should group samples by project and template', async () => {
      const queryBuilder = createQueryBuilderMock();
      const createdAt = new Date('2026-04-03T10:00:00.000Z');
      sampleRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      queryBuilder.getMany.mockResolvedValue([
        {
          id: 'sample-1',
          code: 'SMP-001',
          status: 'pending',
          createdAt,
          project: {
            id: 'project-1',
            name: 'Project A',
            status: 'active',
            client: { id: 'client-1', name: 'Client A' },
          },
          template: {
            id: 'template-1',
            name: 'Template A',
            fields: [
              {
                id: 'field-2',
                name: 'Second',
                dataType: 'number',
                required: false,
                orderIndex: 2,
              },
              {
                id: 'field-1',
                name: 'First',
                dataType: 'text',
                required: true,
                orderIndex: 1,
              },
            ],
          },
          sampleFieldValues: [
            {
              id: 'value-1',
              field: { id: 'field-1' },
              valueText: 'ok',
              valueNumber: null,
              valueDate: null,
              valueBoolean: null,
            },
          ],
        },
      ]);

      const result = await service.findRepository();

      expect(result).toEqual([
        {
          id: 'project-1',
          name: 'Project A',
          status: 'active',
          client: { id: 'client-1', name: 'Client A' },
          templates: [
            {
              id: 'template-1',
              name: 'Template A',
              fields: [
                {
                  id: 'field-1',
                  name: 'First',
                  dataType: 'text',
                  required: true,
                  orderIndex: 1,
                },
                {
                  id: 'field-2',
                  name: 'Second',
                  dataType: 'number',
                  required: false,
                  orderIndex: 2,
                },
              ],
              samples: [
                {
                  id: 'sample-1',
                  code: 'SMP-001',
                  status: 'pending',
                  createdAt,
                  values: [
                    {
                      id: 'value-1',
                      fieldId: 'field-1',
                      valueText: 'ok',
                      valueNumber: null,
                      valueDate: null,
                      valueBoolean: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('createWithValues', () => {
    it('should create sample and values inside transaction', async () => {
      const dto: CreateSampleWithValuesDto = {
        code: 'SMP-2026-0001',
        templateId: 'template-1',
        projectId: 'project-1',
        status: 'pending',
        values: [{ fieldId: 'field-1', valueText: 'Within threshold' }],
      };

      const txSampleRepository = {
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      const txTemplateRepository = { findOne: jest.fn() };
      const txProjectRepository = { findOne: jest.fn() };
      const txSampleFieldValueRepository = { create: jest.fn(), save: jest.fn() };

      const uniqueQueryBuilder = createQueryBuilderMock();
      txSampleRepository.createQueryBuilder.mockReturnValue(uniqueQueryBuilder);
      uniqueQueryBuilder.getOne.mockResolvedValue(null);

      txTemplateRepository.findOne.mockResolvedValue({
        id: 'template-1',
        fields: [
          {
            id: 'field-1',
            dataType: 'text',
            required: true,
          },
        ],
      });
      txProjectRepository.findOne.mockResolvedValue({ id: 'project-1' });
      txSampleRepository.create.mockReturnValue({ id: 'sample-1' });
      txSampleRepository.save.mockResolvedValue({ id: 'sample-1' });
      txSampleFieldValueRepository.create.mockReturnValue({ id: 'sfv-1' });
      txSampleFieldValueRepository.save.mockResolvedValue({ id: 'sfv-1' });

      sampleRepository.manager.transaction.mockImplementation(async (handler) =>
        handler({
          getRepository: (entity: unknown) => {
            if (entity === Sample) {
              return txSampleRepository;
            }
            if (entity === Template) {
              return txTemplateRepository;
            }
            if (entity === Project) {
              return txProjectRepository;
            }
            if (entity === SampleFieldValue) {
              return txSampleFieldValueRepository;
            }

            throw new Error('Unexpected repository request in transaction');
          },
        }),
      );

      const findOneQueryBuilder = createQueryBuilderMock();
      sampleRepository.createQueryBuilder.mockReturnValue(findOneQueryBuilder);
      findOneQueryBuilder.getOne.mockResolvedValue({ id: 'sample-1', code: dto.code });

      const result = await service.createWithValues(dto);

      expect(sampleRepository.manager.transaction).toHaveBeenCalledTimes(1);
      expect(txSampleFieldValueRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'sample-1', code: dto.code });
    });

    it('should throw BadRequestException when values are missing', async () => {
      const dto: CreateSampleWithValuesDto = {
        code: 'SMP-2026-0001',
        templateId: 'template-1',
        projectId: 'project-1',
        values: [],
      };

      const txSampleRepository = {
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      const txTemplateRepository = { findOne: jest.fn() };
      const txProjectRepository = { findOne: jest.fn() };
      const txSampleFieldValueRepository = { create: jest.fn(), save: jest.fn() };
      const uniqueQueryBuilder = createQueryBuilderMock();

      txSampleRepository.createQueryBuilder.mockReturnValue(uniqueQueryBuilder);
      uniqueQueryBuilder.getOne.mockResolvedValue(null);
      txTemplateRepository.findOne.mockResolvedValue({ id: 'template-1', fields: [] });
      txProjectRepository.findOne.mockResolvedValue({ id: 'project-1' });
      txSampleRepository.create.mockReturnValue({ id: 'sample-1' });
      txSampleRepository.save.mockResolvedValue({ id: 'sample-1' });

      sampleRepository.manager.transaction.mockImplementation(async (handler) =>
        handler({
          getRepository: (entity: unknown) => {
            if (entity === Sample) {
              return txSampleRepository;
            }
            if (entity === Template) {
              return txTemplateRepository;
            }
            if (entity === Project) {
              return txProjectRepository;
            }
            if (entity === SampleFieldValue) {
              return txSampleFieldValueRepository;
            }

            throw new Error('Unexpected repository request in transaction');
          },
        }),
      );

      await expect(service.createWithValues(dto)).rejects.toThrow(BadRequestException);
      expect(txSampleFieldValueRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return sample when found', async () => {
      const queryBuilder = createQueryBuilderMock();
      sampleRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      queryBuilder.getOne.mockResolvedValue({ id: 'sample-1', code: 'SMP-1' });

      const result = await service.findOne('sample-1');

      expect(queryBuilder.where).toHaveBeenCalledWith('sample.id = :id', {
        id: 'sample-1',
      });
      expect(result).toEqual({ id: 'sample-1', code: 'SMP-1' });
    });

    it('should throw NotFoundException when sample does not exist', async () => {
      const queryBuilder = createQueryBuilderMock();
      sampleRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update sample and return refreshed entity', async () => {
      const dto: UpdateSampleDto = {
        code: 'SMP-NEW',
        status: 'approved',
      };
      const existing = {
        id: 'sample-1',
        code: 'SMP-OLD',
        status: 'pending',
        template: { id: 'template-1' },
        project: { id: 'project-1' },
      };
      const uniqueQueryBuilder = createQueryBuilderMock();
      const findOneQueryBuilder = createQueryBuilderMock();

      sampleRepository.findOne.mockResolvedValue(existing);
      sampleRepository.createQueryBuilder
        .mockReturnValueOnce(uniqueQueryBuilder)
        .mockReturnValueOnce(findOneQueryBuilder);
      uniqueQueryBuilder.getOne.mockResolvedValue(null);
      sampleRepository.save.mockResolvedValue(undefined);
      findOneQueryBuilder.getOne.mockResolvedValue({
        id: 'sample-1',
        code: 'SMP-NEW',
        status: 'approved',
      });

      const result = await service.update('sample-1', dto);

      expect(sampleRepository.save).toHaveBeenCalledWith({
        ...existing,
        code: 'SMP-NEW',
        status: 'approved',
      });
      expect(result).toEqual({
        id: 'sample-1',
        code: 'SMP-NEW',
        status: 'approved',
      });
    });

    it('should throw NotFoundException when sample to update does not exist', async () => {
      sampleRepository.findOne.mockResolvedValue(null);

      await expect(service.update('missing-id', { code: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove sample when it exists', async () => {
      const existing = { id: 'sample-1' };
      sampleRepository.findOne.mockResolvedValue(existing);
      sampleRepository.remove.mockResolvedValue(undefined);

      await service.remove('sample-1');

      expect(sampleRepository.remove).toHaveBeenCalledWith(existing);
    });

    it('should throw NotFoundException when sample to remove does not exist', async () => {
      sampleRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
