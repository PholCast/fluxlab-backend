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
    const users = await this.userRepo.find({
      order: { createdAt: 'DESC' },
    });

    // Add last_sign_in_at from Supabase for each user
    try {
      const supabase = this.supabaseService.getClient();
      const usersWithSignIn = await Promise.all(
        users.map(async (user) => {
          try {
            const { data: authData } = await supabase.auth.admin.getUserById(user.id);
            return {
              ...user,
              last_sign_in_at: authData?.user?.last_sign_in_at,
            };
          } catch (err) {
            return user;
          }
        }),
      );
      return usersWithSignIn;
    } catch (err) {
      return users;
    }
  }

  async findOne(id: string | number) {
    const user = await this.userRepo.findOne({
      where: { id: String(id) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get last_sign_in_at from Supabase
    try {
      const supabase = this.supabaseService.getClient();
      const { data: authData } = await supabase.auth.admin.getUserById(user.id);
      
      if (authData?.user) {
        return {
          ...user,
          last_sign_in_at: authData.user.last_sign_in_at,
        };
      }
    } catch (err) {
      // If error, return user without last_sign_in_at
    }

    return user;
  }

  async update(id: string | number, data: UpdateUserDto) {
    const user = await this.findOne(id);

    if (typeof data.role === 'string') {
      this.validateRole(data.role);
    }

    const roleChanged = typeof data.role === 'string' && data.role !== user.role;
    const hasPasswordUpdate = typeof data.password === 'string' && data.password.length > 0;
    const previousRole = user.role;

    if (roleChanged) {
      await this.updateAppMetadata(user.id, data.role as string);
    }

    if (hasPasswordUpdate) {
      try {
        await this.updateAuthPassword(user.id, data.password as string);
      } catch (error) {
        if (roleChanged) {
          await this.updateAppMetadata(user.id, previousRole);
        }

        throw error;
      }
    }

    const { password, ...updatableData } = data;
    const mergedUser = this.userRepo.merge(user, updatableData);

    try {
      return await this.userRepo.save(mergedUser);
    } catch (error) {
      if (roleChanged) {
        try {
          await this.updateAppMetadata(user.id, previousRole);
        } catch {
          throw new ConflictException('Failed to persist role in database and failed to rollback Supabase metadata');
        }
      }

      throw error;
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
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new ConflictException(`Error updating password in Supabase: ${error.message}`);
    }
  }

  async changePassword(userId: string, newPassword: string): Promise<{ success: boolean }> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const user = await this.userRepo.findOne({
      where: { id: String(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update password in Supabase
    await this.updateAuthPassword(userId, newPassword);

    // Mark password as changed in database
    user.passwordChanged = true;
    await this.userRepo.save(user);

    return { success: true };
  }

  private validateRole(role: string): void {
    if (!Object.values(ROLES).includes(role as (typeof ROLES)[keyof typeof ROLES])) {
      throw new BadRequestException(`Invalid role. Allowed roles: ${Object.values(ROLES).join(', ')}`);
    }
  }
}