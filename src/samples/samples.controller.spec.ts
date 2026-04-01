import { Test, TestingModule } from '@nestjs/testing';
import { SamplesController } from './controllers/samples.controller';
import { SamplesService } from './services/samples.service';

const samplesServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('SamplesController', () => {
  let controller: SamplesController;

  beforeEach(async () => {
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
