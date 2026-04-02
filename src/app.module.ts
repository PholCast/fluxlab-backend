import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService} from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Env } from './env.model';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { SamplesModule } from './samples/samples.module';
import { AppController } from './app.controller';
import { SupabaseModule } from './supabase/supabase.module';



@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService<Env>) => ({
        type: 'postgres',
        host: configService.get('SUPABASE_HOST', { infer: true }),
        port: configService.get('SUPABASE_PORT', { infer: true }),
        username: configService.get('SUPABASE_USER', { infer: true }),
        password: configService.get('SUPABASE_PASSWORD', { infer: true }),
        database: configService.get('SUPABASE_DB', { infer: true }),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    SamplesModule,
    SupabaseModule,    
  ],
  controllers: [AppController]
})
export class AppModule {}
