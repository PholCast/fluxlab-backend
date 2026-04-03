import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { SupabaseAuthGuard } from 'src/auth/guards/supabase-auth.guard';
import { ROLES } from 'src/auth/roles';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
    return this.usersService.findOne(req.user.id);
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
  changePassword(@Request() req, @Body('password') password: string) {
    return this.usersService.changePassword(req.user.id, password);
  }

  @Delete(':id')
  @UseGuards(new RolesGuard([ROLES.ADMIN]))
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
