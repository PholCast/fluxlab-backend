import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class FilterClientsByDateRangeDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Initial creation date for client filtering (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Final creation date for client filtering (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
