import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from './auth/guards/supabase-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ROLES } from './auth/roles';

@Controller()
export class AppController {
  @Get('public')
  getPublic() {
    return { message: 'Public route' };
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }

  @UseGuards(
    SupabaseAuthGuard,
    new RolesGuard([ROLES.ADMIN])
  )
  @Get('admin')
  getAdmin(@Req() req) {
    return {
      message: 'Admin only',
      user: req.user,
    };
  }
}