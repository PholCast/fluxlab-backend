import { JWTPayload } from 'jose';

export interface SupabaseUser extends JWTPayload {
  app_metadata?: {
    role?: string;
  };
  email?: string;
}