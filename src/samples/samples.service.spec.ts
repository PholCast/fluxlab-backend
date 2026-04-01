import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SamplesService } from './services/samples.service';
import { Project } from '../projects/entities/project.entity';
import { Sample } from './entities/sample.entity';
import { Template } from './entities/template.entity';

const repositoryMock = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('SamplesService', () => {
  let service: SamplesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SamplesService,
        { provide: getRepositoryToken(Sample), useValue: repositoryMock },
        { provide: getRepositoryToken(Template), useValue: repositoryMock },
        { provide: getRepositoryToken(Project), useValue: repositoryMock },
      ],
    }).compile();

    service = module.get<SamplesService>(SamplesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
