import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ROLES } from 'src/auth/roles';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { SupabaseAuthGuard } from 'src/auth/guards/supabase-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(new RolesGuard([ROLES.ADMIN]))
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(new RolesGuard([ROLES.ADMIN]))
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  getCurrentUser(@Request() req) {
    const userId = req.user?.sub || req.user?.id || req.user?.user_id;
    return this.usersService.findOne(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  updatePassword(@Param('id') id: string, @Body('password') password: string) {
    return this.usersService.updateAuthPassword(id, password);
  }

  @Put('change-password')
  @UseGuards(SupabaseAuthGuard)
  changePassword(@Request() req, @Body('password') newPassword: string) {
    const userId = req.user?.sub || req.user?.id || req.user?.user_id;
    return this.usersService.changePassword(userId, newPassword);
  }

  @Patch(':id/role')
  @UseGuards(new RolesGuard([ROLES.ADMIN]))
  updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateUserRole(id, dto.role);
  }

  @Delete(':id')
  @UseGuards(new RolesGuard([ROLES.ADMIN]))
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}