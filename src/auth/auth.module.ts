import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';

@Module({
  providers: [
    SupabaseAuthGuard,
    {
      provide: APP_GUARD,
      useExisting: SupabaseAuthGuard,
    },
  ],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
