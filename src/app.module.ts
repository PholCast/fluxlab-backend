import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService} from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Env } from './env.model';



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
        synchronize: true, // Remember to switch to false
      }),
      inject: [ConfigService],
    }),
    // add other modules here
    
  ],
})
export class AppModule {}
