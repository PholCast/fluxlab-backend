import { Test, TestingModule } from '@nestjs/testing';
import { SamplesController } from './controllers/samples.controller';
import { SamplesService } from './services/samples.service';

describe('SamplesController', () => {
  let controller: SamplesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SamplesController],
      providers: [SamplesService],
    }).compile();

    controller = module.get<SamplesController>(SamplesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
