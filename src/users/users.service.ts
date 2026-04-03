import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES } from '../auth/roles';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(data: CreateUserDto) {
    this.validateRole(data.role);

    const supabase = this.supabaseService.getClient();

    const { data: authData, error } =
      await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

    if (error) {
      throw new ConflictException(error.message);
    }

    if (!authData?.user) {
      throw new Error('User not returned from Supabase');
    }

    try {
      await this.updateAppMetadata(authData.user.id, data.role);

      const user = this.userRepo.create({
        id: authData.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
        active: data.active ?? true,
      });

      await this.userRepo.save(user);

      return user;
    } catch (dbError) {
      await supabase.auth.admin.deleteUser(authData.user.id);

      throw new Error('Database error, user rolled back');
    }
  }

  async findAll() {
    return this.userRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string | number) {
    const user = await this.userRepo.findOne({
      where: { id: String(id) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string | number, data: UpdateUserDto) {
    const user = await this.findOne(id);

    if (typeof data.password !== 'undefined') {
      throw new BadRequestException('Password must be updated using PATCH /users/:id/password');
    }

    if (typeof data.role !== 'undefined') {
      throw new BadRequestException('Role must be updated using PATCH /users/:id/role');
    }

    if (data.email && data.email !== user.email) {
      const emailInUse = await this.userRepo.findOne({ where: { email: data.email } });
      if (emailInUse && emailInUse.id !== user.id) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const updatableData = {
      name: data.name,
      email: data.email,
      active: data.active,
    };
    const mergedUser = this.userRepo.merge(user, updatableData);
    return this.userRepo.save(mergedUser);
  }

  async updateUserRole(userId: string, newRole: string) {
    const user = await this.findOne(userId);
    this.validateRole(newRole);

    if (user.role === newRole) {
      return user;
    }

    const previousRole = user.role;

    await this.updateAppMetadata(user.id, newRole);
    user.role = newRole;

    try {
      return await this.userRepo.save(user);
    } catch {
      await this.updateAppMetadata(user.id, previousRole);
      throw new ConflictException('Failed to update role in database');
    }
  }

  async remove(id: string | number) {
    try {
      const user = await this.findOne(id);
      const supabase = this.supabaseService.getClient();

      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) {
        throw new ConflictException(`Error deleting Supabase user: ${error.message}`);
      }

      await this.userRepo.remove(user);
      return { id: user.id, deleted: true };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      throw new ConflictException('Error deleting user');
    }
  }

  private async updateAppMetadata(userId: string, newRole: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { data: userData, error: fetchError } =
      await supabase.auth.admin.getUserById(userId);

    if (fetchError) {
      throw new ConflictException(`Error obtaining Supabase user: ${fetchError.message}`);
    }

    if (!userData?.user) {
      throw new NotFoundException('Supabase user not found');
    }

    const currentMetadata = userData.user.app_metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      role: newRole,
    };

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: updatedMetadata,
    });

    if (error) {
      throw new ConflictException(`Error updating Supabase metadata: ${error.message}`);
    }
  }

  async updateAuthPassword(userId: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must have at least 8 characters');
    }

    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new ConflictException(`Error updating password in Supabase: ${error.message}`);
    }
  }

  private validateRole(role: string): void {
    if (!Object.values(ROLES).includes(role as (typeof ROLES)[keyof typeof ROLES])) {
      throw new BadRequestException(`Invalid role. Allowed roles: ${Object.values(ROLES).join(', ')}`);
    }
  }
}