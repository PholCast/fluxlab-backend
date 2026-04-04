import { Test, TestingModule } from '@nestjs/testing';
import { SamplesController } from './controllers/samples.controller';
import { SamplesService } from './services/samples.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { CreateSampleWithValuesDto } from './dto/create-sample-with-values.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';

const samplesServiceMock = {
  create: jest.fn(),
  createWithValues: jest.fn(),
  findAll: jest.fn(),
  findRepository: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('SamplesController', () => {
  let controller: SamplesController;
  let service: typeof samplesServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SamplesController],
      providers: [
        {
          provide: SamplesService,
          useValue: samplesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<SamplesController>(SamplesController);
    service = module.get(SamplesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and return result', async () => {
      const dto: CreateSampleDto = {
        code: 'SMP-2026-0001',
        templateId: 'template-1',
        projectId: 'project-1',
        status: 'pending',
      };
      const expected = { id: 'sample-1', code: dto.code };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('createWithValues', () => {
    it('should call service.createWithValues with dto and return result', async () => {
      const dto: CreateSampleWithValuesDto = {
        code: 'SMP-2026-0002',
        templateId: 'template-1',
        projectId: 'project-1',
        status: 'pending',
        values: [{ fieldId: 'field-1', valueText: 'ok' }],
      };
      const expected = { id: 'sample-2', code: dto.code };
      service.createWithValues.mockResolvedValue(expected);

      const result = await controller.createWithValues(dto);

      expect(service.createWithValues).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return result', async () => {
      const expected = [{ id: 'sample-1' }, { id: 'sample-2' }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });
  });

  describe('findRepository', () => {
    it('should call service.findRepository and return grouped data', async () => {
      const expected = [
        {
          id: 'project-1',
          name: 'Project A',
          status: 'active',
          client: { id: 'client-1', name: 'Client A' },
          templates: [],
        },
      ];
      service.findRepository.mockResolvedValue(expected);

      const result = await controller.findRepository();

      expect(service.findRepository).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      const expected = { id: 'sample-1', code: 'SMP-2026-0001' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('0f5f6191-2d1a-4280-af65-aa6d83ce3084');

      expect(service.findOne).toHaveBeenCalledWith('0f5f6191-2d1a-4280-af65-aa6d83ce3084');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto: UpdateSampleDto = {
        code: 'SMP-2026-0099',
        status: 'approved',
      };
      const expected = { id: 'sample-1', code: dto.code, status: dto.status };
      service.update.mockResolvedValue(expected);

      const result = await controller.update(
        '0f5f6191-2d1a-4280-af65-aa6d83ce3084',
        dto,
      );

      expect(service.update).toHaveBeenCalledWith(
        '0f5f6191-2d1a-4280-af65-aa6d83ce3084',
        dto,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('0f5f6191-2d1a-4280-af65-aa6d83ce3084');

      expect(service.remove).toHaveBeenCalledWith('0f5f6191-2d1a-4280-af65-aa6d83ce3084');
      expect(result).toBeUndefined();
    });
  });
});
