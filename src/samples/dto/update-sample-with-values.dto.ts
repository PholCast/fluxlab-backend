import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateSampleWithValuesItemDto } from './create-sample-with-values.dto';
import { UpdateSampleDto } from './update-sample.dto';

export class UpdateSampleWithValuesDto extends UpdateSampleDto {
  @ApiPropertyOptional({ example: 'uuid-of-template' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-project' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    type: CreateSampleWithValuesItemDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSampleWithValuesItemDto)
  values?: CreateSampleWithValuesItemDto[];
}
