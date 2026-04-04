import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

jest.mock(
  'src/auth/guards/roles.guard',
  () => ({
    RolesGuard: class RolesGuard {
      canActivate() {
        return true;
      }
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/auth/guards/supabase-auth.guard',
  () => ({
    SupabaseAuthGuard: class SupabaseAuthGuard {
      canActivate() {
        return true;
      }
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/auth/roles',
  () => ({
    ROLES: {
      ADMIN: 'admin',
      USER: 'user',
      TECHNICIAN: 'technician',
      RESEARCHER: 'researcher',
    },
  }),
  { virtual: true },
);

const usersServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  updateAuthPassword: jest.fn(),
  changePassword: jest.fn(),
  updateUserRole: jest.fn(),
  remove: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: typeof usersServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const dto: CreateUserDto = {
        name: 'Ana Martinez',
        email: 'ana@fluxlab.io',
        password: 'S3curePass123!',
        role: 'user',
        active: true,
      };
      const expected = { id: 'user-1', ...dto };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      const expected = [{ id: 'user-1' }, { id: 'user-2' }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });
  });

  describe('getCurrentUser', () => {
    it('should use req.user.sub when present', async () => {
      service.findOne.mockResolvedValue({ id: 'auth-sub-id' });

      const result = await controller.getCurrentUser({ user: { sub: 'auth-sub-id' } });

      expect(service.findOne).toHaveBeenCalledWith('auth-sub-id');
      expect(result).toEqual({ id: 'auth-sub-id' });
    });

    it('should fallback to req.user.id when sub is absent', async () => {
      service.findOne.mockResolvedValue({ id: 'auth-id' });

      await controller.getCurrentUser({ user: { id: 'auth-id' } });

      expect(service.findOne).toHaveBeenCalledWith('auth-id');
    });

    it('should fallback to req.user.user_id when sub and id are absent', async () => {
      service.findOne.mockResolvedValue({ id: 'auth-user-id' });

      await controller.getCurrentUser({ user: { user_id: 'auth-user-id' } });

      expect(service.findOne).toHaveBeenCalledWith('auth-user-id');
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with route id', async () => {
      const expected = { id: 'user-1', email: 'ana@fluxlab.io' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('user-1');

      expect(service.findOne).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto: UpdateUserDto = { name: 'Ana Maria', active: false };
      const expected = { id: 'user-1', ...dto };
      service.update.mockResolvedValue(expected);

      const result = await controller.update('user-1', dto);

      expect(service.update).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('updatePassword', () => {
    it('should call service.updateAuthPassword with id and password', async () => {
      service.updateAuthPassword.mockResolvedValue(undefined);

      const result = await controller.updatePassword('user-1', 'new-password-123');

      expect(service.updateAuthPassword).toHaveBeenCalledWith(
        'user-1',
        'new-password-123',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('changePassword', () => {
    it('should resolve user id from request and call service.changePassword', async () => {
      const expected = { id: 'user-1', passwordChanged: true };
      service.changePassword.mockResolvedValue(expected);

      const result = await controller.changePassword(
        { user: { sub: 'user-1' } },
        'new-password-123',
      );

      expect(service.changePassword).toHaveBeenCalledWith('user-1', 'new-password-123');
      expect(result).toEqual(expected);
    });
  });

  describe('updateRole', () => {
    it('should call service.updateUserRole with id and dto.role', async () => {
      const dto: UpdateUserRoleDto = { role: 'admin' };
      const expected = { id: 'user-1', role: 'admin' };
      service.updateUserRole.mockResolvedValue(expected);

      const result = await controller.updateRole('user-1', dto);

      expect(service.updateUserRole).toHaveBeenCalledWith('user-1', 'admin');
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      const expected = { id: 'user-1', deleted: true };
      service.remove.mockResolvedValue(expected);

      const result = await controller.remove('user-1');

      expect(service.remove).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });
});
