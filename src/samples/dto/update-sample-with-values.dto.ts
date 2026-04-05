import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSampleWithValuesItemDto } from './create-sample-with-values.dto';

export class UpdateSampleWithValuesDto {
  @ApiPropertyOptional({ example: 'completed', enum: ['pending', 'completed', 'rejected'] })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'rejected'])
  status?: string;

  @ApiProperty({ type: [CreateSampleWithValuesItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateSampleWithValuesItemDto)
  values: CreateSampleWithValuesItemDto[];
}