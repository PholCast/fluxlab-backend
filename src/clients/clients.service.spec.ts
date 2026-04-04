import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const createClientsRepositoryMock = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  merge: jest.fn(),
  remove: jest.fn(),
});

const createProjectsRepositoryMock = () => ({
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('ClientsService', () => {
  let service: ClientsService;
  let clientsRepository: ReturnType<typeof createClientsRepositoryMock>;
  let projectsRepository: ReturnType<typeof createProjectsRepositoryMock>;

  beforeEach(async () => {
    clientsRepository = createClientsRepositoryMock();
    projectsRepository = createProjectsRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: getRepositoryToken(Client),
          useValue: clientsRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createClientDto: CreateClientDto = {
      name: 'Acme Labs',
      email: 'contact@acme.com',
      phoneNumber: '+1 555 111 2222',
      status: 'active',
      address: 'Main Street 123',
    };

    it('should create a client when email does not exist', async () => {
      const createdClient = { id: 'client-1', ...createClientDto };

      clientsRepository.findOne.mockResolvedValue(null);
      clientsRepository.create.mockReturnValue(createdClient);
      clientsRepository.save.mockResolvedValue(createdClient);

      const result = await service.create(createClientDto);

      expect(clientsRepository.findOne).toHaveBeenCalledWith({
        where: { email: createClientDto.email },
      });
      expect(clientsRepository.create).toHaveBeenCalledWith({
        name: createClientDto.name,
        email: createClientDto.email,
        phoneNumber: createClientDto.phoneNumber,
        status: createClientDto.status,
        address: createClientDto.address,
      });
      expect(clientsRepository.save).toHaveBeenCalledWith(createdClient);
      expect(result).toEqual(createdClient);
    });

    it('should throw ConflictException when email already exists', async () => {
      clientsRepository.findOne.mockResolvedValue({ id: 'existing-client' });

      await expect(service.create(createClientDto)).rejects.toThrow(
        ConflictException,
      );
      expect(clientsRepository.create).not.toHaveBeenCalled();
      expect(clientsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return clients with success message when clients exist', async () => {
      const clients = [{ id: 'client-1', name: 'Acme' }];
      clientsRepository.find.mockResolvedValue(clients);

      const result = await service.findAll();

      expect(clientsRepository.find).toHaveBeenCalledWith({
        relations: { projects: true },
        order: { name: 'ASC' },
      });
      expect(result).toEqual({
        message: 'Clients retrieved successfully',
        data: clients,
      });
    });

    it('should return empty message when no clients exist', async () => {
      clientsRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual({
        message: 'No clients found',
        data: [],
      });
    });
  });

  describe('findOne', () => {
    it('should return client by id', async () => {
      const client = { id: 'client-1', name: 'Acme' };
      clientsRepository.findOne.mockResolvedValue(client);

      const result = await service.findOne('client-1');

      expect(clientsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        relations: { projects: true },
      });
      expect(result).toEqual(client);
    });

    it('should throw NotFoundException when client does not exist', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const existingClient = {
      id: 'client-1',
      name: 'Acme',
      email: 'contact@acme.com',
      phoneNumber: '+1 555 111 2222',
      status: 'active',
      address: 'Main Street 123',
    };

    it('should update client when email is unchanged', async () => {
      const dto: UpdateClientDto = { name: 'Acme Updated' };
      const merged = { ...existingClient, ...dto };

      clientsRepository.findOne.mockResolvedValue(existingClient);
      clientsRepository.merge.mockReturnValue(merged);
      clientsRepository.save.mockResolvedValue(merged);

      const result = await service.update(existingClient.id, dto);

      expect(clientsRepository.merge).toHaveBeenCalledWith(existingClient, {
        ...dto,
        phoneNumber: existingClient.phoneNumber,
        address: existingClient.address,
      });
      expect(clientsRepository.save).toHaveBeenCalledWith(merged);
      expect(result).toEqual(merged);
    });

    it('should validate new email uniqueness before update', async () => {
      const dto: UpdateClientDto = { email: 'new@acme.com' };
      const merged = { ...existingClient, ...dto };

      clientsRepository.findOne
        .mockResolvedValueOnce(existingClient)
        .mockResolvedValueOnce(null);
      clientsRepository.merge.mockReturnValue(merged);
      clientsRepository.save.mockResolvedValue(merged);

      const result = await service.update(existingClient.id, dto);

      expect(clientsRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { email: dto.email },
      });
      expect(result).toEqual(merged);
    });

    it('should throw ConflictException when new email belongs to another client', async () => {
      const dto: UpdateClientDto = { email: 'new@acme.com' };

      clientsRepository.findOne
        .mockResolvedValueOnce(existingClient)
        .mockResolvedValueOnce({ id: 'client-2', email: dto.email });

      await expect(service.update(existingClient.id, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(clientsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when client to update does not exist', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(clientsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException when confirm is false', async () => {
      await expect(service.remove('client-1', false)).rejects.toThrow(
        BadRequestException,
      );
      expect(clientsRepository.findOne).not.toHaveBeenCalled();
      expect(projectsRepository.update).not.toHaveBeenCalled();
      expect(clientsRepository.remove).not.toHaveBeenCalled();
    });

    it('should remove client and unlink projects when confirm is true', async () => {
      const client = { id: 'client-1', name: 'Acme' };
      clientsRepository.findOne.mockResolvedValue(client);

      const result = await service.remove('client-1', true);

      expect(projectsRepository.update).toHaveBeenCalledWith(
        { client: { id: client.id } },
        { client: null },
      );
      expect(clientsRepository.remove).toHaveBeenCalledWith(client);
      expect(result).toEqual({ message: 'Client deleted successfully' });
    });
  });

  describe('searchClientsByName', () => {
    it('should throw BadRequestException when name is empty', async () => {
      await expect(service.searchClientsByName('   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(clientsRepository.find).not.toHaveBeenCalled();
    });

    it('should return clients found by name', async () => {
      const clients = [{ id: 'client-1', name: 'Acme Labs' }];
      clientsRepository.find.mockResolvedValue(clients);

      const result = await service.searchClientsByName(' Acme ');

      expect(clientsRepository.find).toHaveBeenCalledWith({
        where: { name: expect.anything() },
        relations: { projects: true },
        order: { name: 'ASC' },
      });
      expect(result).toEqual({
        message: 'Clients found',
        data: clients,
      });
    });

    it('should return not found message when there are no matching clients', async () => {
      clientsRepository.find.mockResolvedValue([]);

      const result = await service.searchClientsByName('Unknown');

      expect(result).toEqual({
        message: 'No clients found matching the provided name',
        data: [],
      });
    });
  });

  describe('filterByClient', () => {
    const client = { id: 'client-1', name: 'Acme' };
    const projects = [{ id: 'project-1' }, { id: 'project-2' }];

    const queryBuilderMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    it('should return client with all projects when status is not provided', async () => {
      clientsRepository.findOne.mockResolvedValue(client);
      projectsRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);
      queryBuilderMock.getMany.mockResolvedValue(projects);

      const result = await service.filterByClient(client.id);

      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(queryBuilderMock.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual({
        client,
        totalProjects: 2,
        projects,
      });
    });

    it('should apply status filter when projectStatus is provided', async () => {
      clientsRepository.findOne.mockResolvedValue(client);
      projectsRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);
      queryBuilderMock.getMany.mockResolvedValue(projects);

      await service.filterByClient(client.id, ' completed ');

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'LOWER(project.status) = LOWER(:status)',
        { status: 'completed' },
      );
    });

    it('should throw NotFoundException when client does not exist', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      await expect(service.filterByClient('missing-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(projectsRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
