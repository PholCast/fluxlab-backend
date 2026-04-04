import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
  ) {}

  async create(createClientDto: CreateClientDto) {
    await this.ensureClientNameIsUnique(createClientDto.name);

    const existingClient = await this.clientsRepository.findOne({
      where: { email: createClientDto.email },
    });

    if (existingClient) {
      throw new ConflictException('A client with this email already exists');
    }

    const client = this.clientsRepository.create({
      name: createClientDto.name,
      email: createClientDto.email,
      phoneNumber: this.normalizePhoneNumber(createClientDto.phoneNumber),
      status: createClientDto.status ?? 'active',
      address: createClientDto.address ?? null,
    });

    return this.clientsRepository.save(client);
  }
  
  async findAll() {
    const clients = await this.clientsRepository.find({
      relations: { projects: true },
      order: { name: 'ASC' },
    });

    return {
      message: clients.length ? 'Clients retrieved successfully' : 'No clients found',
      data: clients,
    };
  }

  async findOne(id: string) {
    const client = await this.clientsRepository.findOne({
      where: { id },
      relations: { projects: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    const client = await this.findClientByIdOrFail(id);

    if (typeof updateClientDto.name === 'string') {
      const nextNameLower = this.normalizeNameLower(updateClientDto.name);
      const currentNameLower = this.normalizeNameLower(client.name);

      if (nextNameLower !== currentNameLower) {
        await this.ensureClientNameIsUnique(updateClientDto.name, id);
      }
    }

    if (updateClientDto.email && updateClientDto.email !== client.email) {
      const emailTaken = await this.clientsRepository.findOne({
        where: { email: updateClientDto.email },
      });

      if (emailTaken && emailTaken.id !== id) {
        throw new ConflictException('A client with this email already exists');
      }
    }

    const mergedClient = this.clientsRepository.merge(client, {
      ...updateClientDto,
      phoneNumber: Object.prototype.hasOwnProperty.call(updateClientDto, 'phoneNumber')
        ? this.normalizePhoneNumber(updateClientDto.phoneNumber)
        : client.phoneNumber,
      address: updateClientDto.address ?? client.address,
    });

    return this.clientsRepository.save(mergedClient);
  }

  async remove(id: string, confirm?: boolean) {
    if (!confirm) {
      throw new BadRequestException('Deletion confirmation is required');
    }

    const client = await this.findClientByIdOrFail(id);

    await this.projectsRepository.update({ client: { id: client.id } }, { client: null });
    await this.clientsRepository.remove(client);

    return { message: 'Client deleted successfully' };
  }

  async searchClientsByName(name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Name query is required');
    }

    const normalizedName = name.trim();

    const clients = await this.clientsRepository.find({
      where: { name: ILike(`%${normalizedName}%`) },
      relations: { projects: true },
      order: { name: 'ASC' },
    });

    return {
      message: clients.length ? 'Clients found' : 'No clients found matching the provided name',
      data: clients,
    };
  }

  async filterByClient(clientId: string, projectStatus?: string) {
    const client = await this.findClientByIdOrFail(clientId);

    const projectsQuery = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('project.samples', 'samples')
      .leftJoinAndSelect('project.reports', 'reports')
      .where('client.id = :clientId', { clientId })
      .orderBy('project.created_at', 'DESC');
    
    if (projectStatus?.trim()) {
      projectsQuery.andWhere('LOWER(project.status) = LOWER(:status)', {
        status: projectStatus.trim(),
      });
    }

    const projects = await projectsQuery.getMany();

    return {
      client,
      totalProjects: projects.length,
      projects,
    };
  }

  private async findClientByIdOrFail(clientId: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({ where: { id: clientId } });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  private normalizeNameLower(name: string): string {
    return name.toLowerCase();
  }

  private normalizePhoneNumber(phoneNumber?: string | null): string | null {
    if (typeof phoneNumber !== 'string') {
      return phoneNumber ?? null;
    }

    const trimmedPhoneNumber = phoneNumber.trim();
    return trimmedPhoneNumber.length ? trimmedPhoneNumber : null;
  }

  private async ensureClientNameIsUnique(name: string, currentClientId?: string): Promise<void> {
    const nameLower = this.normalizeNameLower(name);

    const query = this.clientsRepository
      .createQueryBuilder('client')
      .where('LOWER(client.name) = :nameLower', { nameLower });

    if (currentClientId) {
      query.andWhere('client.id != :currentClientId', { currentClientId });
    }

    const existingClient = await query.getOne();
    if (existingClient) {
      throw new ConflictException('A client with this name already exists');
    }
  }
}
