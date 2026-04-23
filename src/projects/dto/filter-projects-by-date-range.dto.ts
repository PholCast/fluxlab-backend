import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class FilterProjectsByDateRangeDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Initial creation date for project filtering (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Final creation date for project filtering (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    example: '3f7da128-cadf-4bd8-9a2a-5581d1fcb1d7',
    description: 'Optional client scope for filtering.',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;
}
