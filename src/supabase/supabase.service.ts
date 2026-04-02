import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Env } from '../env.model';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.client = createClient(
      this.configService.get('SUPABASE_URL', { infer: true }),
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }),
    );
  }

  getClient() {
    return this.client;
  }
}