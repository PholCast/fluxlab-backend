import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const clientsServiceMock = {
  create: jest.fn(),
  searchClientsByName: jest.fn(),
  filterByClient: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: typeof clientsServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: clientsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
    service = module.get(ClientsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and return its result', async () => {
      const dto: CreateClientDto = {
        name: 'Acme Labs',
        email: 'contact@acme.com',
        phoneNumber: '+1 555 111 2222',
        status: 'active',
        address: 'Main Street 123',
      };
      const expected = { id: 'client-1', ...dto };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('searchByName', () => {
    it('should call service.searchClientsByName with query name', async () => {
      const expected = { message: 'Clients found', data: [{ id: 'client-1' }] };
      service.searchClientsByName.mockResolvedValue(expected);

      const result = await controller.searchByName('Acme');

      expect(service.searchClientsByName).toHaveBeenCalledWith('Acme');
      expect(result).toEqual(expected);
    });
  });

  describe('filterByClient', () => {
    it('should call service.filterByClient with clientId and projectStatus', async () => {
      const expected = { client: { id: 'client-1' }, totalProjects: 1, projects: [] };
      service.filterByClient.mockResolvedValue(expected);

      const result = await controller.filterByClient('client-1', 'completed');

      expect(service.filterByClient).toHaveBeenCalledWith(
        'client-1',
        'completed',
      );
      expect(result).toEqual(expected);
    });

    it('should call service.filterByClient with undefined projectStatus when not provided', async () => {
      service.filterByClient.mockResolvedValue({
        client: { id: 'client-1' },
        totalProjects: 0,
        projects: [],
      });

      await controller.filterByClient('client-1');

      expect(service.filterByClient).toHaveBeenCalledWith('client-1', undefined);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return its result', async () => {
      const expected = { message: 'Clients retrieved successfully', data: [] };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      const expected = { id: 'client-1', name: 'Acme Labs' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('client-1');

      expect(service.findOne).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto: UpdateClientDto = { name: 'Acme Labs Updated' };
      const expected = { id: 'client-1', name: 'Acme Labs Updated' };
      service.update.mockResolvedValue(expected);

      const result = await controller.update('client-1', dto);

      expect(service.update).toHaveBeenCalledWith('client-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should pass true to service.remove when confirm is "true"', async () => {
      service.remove.mockResolvedValue({ message: 'Client deleted successfully' });

      const result = await controller.remove('client-1', 'true');

      expect(service.remove).toHaveBeenCalledWith('client-1', true);
      expect(result).toEqual({ message: 'Client deleted successfully' });
    });

    it('should pass false to service.remove when confirm is missing', async () => {
      service.remove.mockResolvedValue({ message: 'Client deleted successfully' });

      await controller.remove('client-1');

      expect(service.remove).toHaveBeenCalledWith('client-1', false);
    });

    it('should pass false to service.remove when confirm is not "true"', async () => {
      service.remove.mockResolvedValue({ message: 'Client deleted successfully' });

      await controller.remove('client-1', 'false');

      expect(service.remove).toHaveBeenCalledWith('client-1', false);
    });
  });
});
