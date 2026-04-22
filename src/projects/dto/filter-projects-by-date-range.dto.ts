import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class FilterProjectsByDateRangeDto {
  @ApiProperty({
    example: '2026-01-01',
    description: 'Initial date for project range filtering (YYYY-MM-DD).',
  })
  @IsDateString()
  fromDate: string;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Final date for project range filtering (YYYY-MM-DD).',
  })
  @IsDateString()
  toDate: string;

  @ApiPropertyOptional({
    example: '3f7da128-cadf-4bd8-9a2a-5581d1fcb1d7',
    description: 'Optional client scope for date range filtering.',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;
}
