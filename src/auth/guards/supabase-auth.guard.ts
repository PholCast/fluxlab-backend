import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Env } from 'src/env.model';
import { SupabaseUser } from '../types/supabase-user.interface';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private jwks;
  private issuer: string;

  constructor(private configService: ConfigService<Env>) {
    const projectId = this.configService.get('SUPABASE_PROJECT_ID', {
      infer: true,
    });

    if (!projectId) {
      throw new Error('SUPABASE_PROJECT_ID is not defined');
    }

    this.issuer = `https://${projectId}.supabase.co/auth/v1`;

    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}/.well-known/jwks.json`)
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      });

      request.user = payload as SupabaseUser; 
      return true;
    } catch (err) {
      console.error(err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}