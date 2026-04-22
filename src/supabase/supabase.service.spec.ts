import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('SupabaseService', () => {
  let service: SupabaseService;
  let configService: { get: jest.Mock };

  const clientMock = {
    auth: {},
    from: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'SUPABASE_URL') {
          return 'https://test-project.supabase.co';
        }

        if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
          return 'service-role-key';
        }

        return undefined;
      }),
    };

    (createClient as jest.Mock).mockReturnValue(clientMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize supabase client with env values from ConfigService', () => {
    expect(configService.get).toHaveBeenCalledWith('SUPABASE_URL', { infer: true });
    expect(configService.get).toHaveBeenCalledWith('SUPABASE_SERVICE_ROLE_KEY', {
      infer: true,
    });
    expect(createClient).toHaveBeenCalledWith(
      'https://test-project.supabase.co',
      'service-role-key',
    );
  });

  it('should return initialized client in getClient', () => {
    expect(service.getClient()).toBe(clientMock);
  });
});
