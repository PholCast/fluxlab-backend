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
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async update(id: string | number, data: UpdateUserDto) {
    const user = await this.findOne(id);
    const normalizedName = typeof data.name === 'string' ? data.name.trim() : undefined;
    const normalizedEmail = typeof data.email === 'string' ? data.email.trim() : undefined;

    if (typeof data.password !== 'undefined') {
      throw new BadRequestException('La contraseña debe actualizarse usando PATCH /users/:id/password');
    }

    if (typeof data.role !== 'undefined') {
      throw new BadRequestException('El rol debe actualizarse usando PATCH /users/:id/role');
    }

    if (normalizedEmail && normalizedEmail !== user.email) {
      const emailInUse = await this.userRepo.findOne({ where: { email: normalizedEmail } });
      if (emailInUse && emailInUse.id !== user.id) {
        throw new ConflictException('Ya existe un usuario con este correo electrónico');
      }
    }

    let authEmailUpdated = false;

    if (normalizedEmail && normalizedEmail !== user.email) {
      await this.updateAuthEmail(user.id, normalizedEmail);
      authEmailUpdated = true;
    }

    const updatableData: Partial<User> = {};

    if (typeof normalizedName !== 'undefined') {
      updatableData.name = normalizedName;
    }

    if (typeof normalizedEmail !== 'undefined') {
      updatableData.email = normalizedEmail;
    }

    if (typeof data.active !== 'undefined') {
      updatableData.active = data.active;
    }

    try {
      const mergedUser = this.userRepo.merge(user, updatableData);
      return await this.userRepo.save(mergedUser);
    } catch (error) {
      if (authEmailUpdated) {
        try {
          await this.updateAuthEmail(user.id, user.email);
        } catch {
          // Best-effort rollback for Supabase auth email.
        }
      }

      throw new ConflictException('No se pudo actualizar el usuario');
    }
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
      throw new ConflictException('No se pudo actualizar el rol en la base de datos');
    }
  }

  async remove(id: string | number) {
    try {
      const user = await this.findOne(id);
      const supabase = this.supabaseService.getClient();

      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) {
        throw new ConflictException(`Error al eliminar usuario de Supabase: ${error.message}`);
      }

      await this.userRepo.remove(user);
      return { id: user.id, deleted: true };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      throw new ConflictException('Error al eliminar usuario');
    }
  }

  private async updateAppMetadata(userId: string, newRole: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { data: userData, error: fetchError } =
      await supabase.auth.admin.getUserById(userId);

    if (fetchError) {
      throw new ConflictException(`Error al obtener usuario de Supabase: ${fetchError.message}`);
    }

    if (!userData?.user) {
      throw new NotFoundException('Usuario de Supabase no encontrado');
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
      throw new ConflictException(`Error al actualizar metadatos de Supabase: ${error.message}`);
    }
  }

  private async updateAuthEmail(userId: string, email: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });

    if (error) {
      throw new ConflictException(`Error al actualizar el correo en Supabase: ${error.message}`);
    }
  }

  async updateAuthPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<User> {
    if (!currentPassword || !currentPassword.trim()) {
      throw new BadRequestException('Se requiere la contraseña actual');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }

    const user = await this.findOne(userId);
    await this.verifyCurrentPassword(user.email, currentPassword);

    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new ConflictException(`Error al actualizar la contraseña en Supabase: ${error.message}`);
    }

    if (!user.passwordChanged) {
      user.passwordChanged = true;
    }

    return this.userRepo.save(user);
  }

  async changePassword(userId: string, newPassword: string): Promise<any> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }

    const supabase = this.supabaseService.getClient();

    // Update password in Supabase
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new ConflictException(`Error al actualizar la contraseña en Supabase: ${error.message}`);
    }

    // Mark passwordChanged as true in database
    const user = await this.findOne(userId);
    user.passwordChanged = true;
    await this.userRepo.save(user);

    return user;
  }

  private validateRole(role: string): void {
    if (!Object.values(ROLES).includes(role as (typeof ROLES)[keyof typeof ROLES])) {
      throw new BadRequestException(`Rol inválido. Roles permitidos: ${Object.values(ROLES).join(', ')}`);
    }
  }

  private async verifyCurrentPassword(email: string, password: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
  }
}