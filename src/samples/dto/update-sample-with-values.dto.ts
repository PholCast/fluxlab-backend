import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSampleWithValuesItemDto } from './create-sample-with-values.dto';

export class UpdateSampleWithValuesDto {
  @ApiPropertyOptional({ example: 'EXT-2026-0001', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customCode?: string;

  @ApiPropertyOptional({ example: 'completed', enum: ['pending', 'completed', 'rejected'] })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'rejected'])
  status?: string;

  @ApiProperty({ type: [CreateSampleWithValuesItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateSampleWithValuesItemDto)
  values: CreateSampleWithValuesItemDto[];
}