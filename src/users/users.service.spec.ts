import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseService } from '../supabase/supabase.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ROLES } from '../auth/roles';

const createUserRepoMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  remove: jest.fn(),
});

const createSupabaseClientMock = () => ({
  auth: {
    admin: {
      createUser: jest.fn(),
      deleteUser: jest.fn(),
      getUserById: jest.fn(),
      updateUserById: jest.fn(),
    },
  },
});

const createSupabaseServiceMock = () => ({
  getClient: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: ReturnType<typeof createUserRepoMock>;
  let supabaseService: ReturnType<typeof createSupabaseServiceMock>;
  let supabaseClient: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    userRepo = createUserRepoMock();
    supabaseService = createSupabaseServiceMock();
    supabaseClient = createSupabaseClientMock();
    supabaseService.getClient.mockReturnValue(supabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: SupabaseService,
          useValue: supabaseService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto: CreateUserDto = {
      name: 'Ana Martinez',
      email: 'ana@fluxlab.io',
      password: 'S3curePass123!',
      role: ROLES.USER,
      active: true,
    };

    it('should create user in Supabase, sync metadata, and save in DB', async () => {
      const createdUser = {
        id: 'user-1',
        name: validDto.name,
        email: validDto.email,
        role: validDto.role,
        active: true,
      };

      supabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      supabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: { app_metadata: {} } },
        error: null,
      });
      supabaseClient.auth.admin.updateUserById.mockResolvedValue({ error: null });
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);

      const result = await service.create(validDto);

      expect(supabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: validDto.email,
        password: validDto.password,
        email_confirm: true,
      });
      expect(userRepo.create).toHaveBeenCalledWith({
        id: 'user-1',
        email: validDto.email,
        name: validDto.name,
        role: validDto.role,
        active: true,
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw BadRequestException when role is invalid', async () => {
      await expect(
        service.create({ ...validDto, role: 'invalid-role' }),
      ).rejects.toThrow(BadRequestException);

      expect(supabaseClient.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when Supabase createUser fails', async () => {
      supabaseClient.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' },
      });

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should rollback Supabase user when DB save fails', async () => {
      supabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      supabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: { app_metadata: {} } },
        error: null,
      });
      supabaseClient.auth.admin.updateUserById.mockResolvedValue({ error: null });
      userRepo.create.mockReturnValue({ id: 'user-1' });
      userRepo.save.mockRejectedValue(new Error('db error'));
      supabaseClient.auth.admin.deleteUser.mockResolvedValue({ error: null });

      await expect(service.create(validDto)).rejects.toThrow(
        'Database error, user rolled back',
      );
      expect(supabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findAll', () => {
    it('should return users ordered by createdAt desc', async () => {
      const users = [{ id: 'user-1' }];
      userRepo.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(userRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return user when it exists', async () => {
      const user = { id: 'user-1', email: 'ana@fluxlab.io' };
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.findOne('user-1');

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw BadRequestException when password is included', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'user-1' } as User);

      await expect(
        service.update('user-1', { password: 'new-password-123' } as UpdateUserDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when role is included', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'user-1' } as User);

      await expect(
        service.update('user-1', { role: ROLES.ADMIN } as UpdateUserDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when email is in use by another user', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'user-1',
        email: 'old@fluxlab.io',
      } as User);
      userRepo.findOne.mockResolvedValue({ id: 'user-2', email: 'taken@fluxlab.io' });

      await expect(
        service.update('user-1', { email: 'taken@fluxlab.io' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should merge and save allowed fields', async () => {
      const existing = {
        id: 'user-1',
        name: 'Ana',
        email: 'ana@fluxlab.io',
        active: true,
      };
      const merged = { ...existing, name: 'Ana Maria', active: false };
      jest.spyOn(service, 'findOne').mockResolvedValue(existing as User);
      userRepo.merge.mockReturnValue(merged);
      userRepo.save.mockResolvedValue(merged);

      const result = await service.update('user-1', {
        name: 'Ana Maria',
        active: false,
      });

      expect(userRepo.merge).toHaveBeenCalledWith(existing, {
        name: 'Ana Maria',
        email: undefined,
        active: false,
      });
      expect(result).toEqual(merged);
    });
  });

  describe('updateUserRole', () => {
    it('should return same user when role is unchanged', async () => {
      const user = { id: 'user-1', role: ROLES.USER } as User;
      jest.spyOn(service, 'findOne').mockResolvedValue(user);

      const result = await service.updateUserRole('user-1', ROLES.USER);

      expect(result).toBe(user);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should update metadata and persist new role', async () => {
      const user = { id: 'user-1', role: ROLES.USER } as User;
      jest.spyOn(service, 'findOne').mockResolvedValue(user);
      supabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: { app_metadata: { source: 'tests' } } },
        error: null,
      });
      supabaseClient.auth.admin.updateUserById.mockResolvedValue({ error: null });
      userRepo.save.mockResolvedValue({ ...user, role: ROLES.ADMIN });

      const result = await service.updateUserRole('user-1', ROLES.ADMIN);

      expect(supabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith('user-1', {
        app_metadata: { source: 'tests', role: ROLES.ADMIN },
      });
      expect(result).toEqual({ ...user, role: ROLES.ADMIN });
    });

    it('should rollback metadata when DB save fails', async () => {
      const user = { id: 'user-1', role: ROLES.USER } as User;
      jest.spyOn(service, 'findOne').mockResolvedValue(user);
      supabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: { app_metadata: {} } },
        error: null,
      });
      supabaseClient.auth.admin.updateUserById.mockResolvedValue({ error: null });
      userRepo.save.mockRejectedValue(new Error('db error'));

      await expect(service.updateUserRole('user-1', ROLES.ADMIN)).rejects.toThrow(
        ConflictException,
      );

      expect(supabaseClient.auth.admin.updateUserById).toHaveBeenNthCalledWith(1, 'user-1', {
        app_metadata: { role: ROLES.ADMIN },
      });
      expect(supabaseClient.auth.admin.updateUserById).toHaveBeenNthCalledWith(2, 'user-1', {
        app_metadata: { role: ROLES.USER },
      });
    });
  });

  describe('updateAuthPassword', () => {
    it('should throw BadRequestException when password is too short', async () => {
      await expect(service.updateAuthPassword('user-1', '123')).rejects.toThrow(
        BadRequestException,
      );
      expect(supabaseClient.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it('should update password in Supabase', async () => {
      supabaseClient.auth.admin.updateUserById.mockResolvedValue({ error: null });

      await service.updateAuthPassword('user-1', 'new-password-123');

      expect(supabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith('user-1', {
        password: 'new-password-123',
      });
    });
  });

  describe('changePassword', () => {
    it('should update password and mark passwordChanged true', async () => {
      const user = { id: 'user-1', passwordChanged: false } as User;
      supabaseClient.auth.admin.updateUserById.mockResolvedValue({ error: null });
      jest.spyOn(service, 'findOne').mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, passwordChanged: true });

      const result = await service.changePassword('user-1', 'new-password-123');

      expect(userRepo.save).toHaveBeenCalledWith({
        ...user,
        passwordChanged: true,
      });
      expect(result).toEqual({ ...user, passwordChanged: true });
    });
  });

  describe('remove', () => {
    it('should delete from Supabase and then remove from database', async () => {
      const user = { id: 'user-1' } as User;
      jest.spyOn(service, 'findOne').mockResolvedValue(user);
      supabaseClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
      userRepo.remove.mockResolvedValue(undefined);

      const result = await service.remove('user-1');

      expect(supabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
      expect(userRepo.remove).toHaveBeenCalledWith(user);
      expect(result).toEqual({ id: 'user-1', deleted: true });
    });

    it('should throw ConflictException when Supabase delete fails', async () => {
      const user = { id: 'user-1' } as User;
      jest.spyOn(service, 'findOne').mockResolvedValue(user);
      supabaseClient.auth.admin.deleteUser.mockResolvedValue({
        error: { message: 'cannot delete' },
      });

      await expect(service.remove('user-1')).rejects.toThrow(ConflictException);
      expect(userRepo.remove).not.toHaveBeenCalled();
    });
  });
});
