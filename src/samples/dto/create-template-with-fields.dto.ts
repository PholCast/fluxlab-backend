import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FIELD_DATA_TYPES } from '../constants/sample.constants';
import { CreateTemplateDto } from './create-template.dto';

export class CreateTemplateWithFieldsItemDto {
  @ApiProperty({ example: 'pH Level' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'number', enum: FIELD_DATA_TYPES })
  @IsString()
  @IsIn(FIELD_DATA_TYPES)
  dataType!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  required!: boolean;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  orderIndex!: number;
}

export class CreateTemplateWithFieldsDto extends CreateTemplateDto {
  @ApiPropertyOptional({
    type: CreateTemplateWithFieldsItemDto,
    isArray: true,
    example: [
      {
        name: 'pH Level',
        dataType: 'number',
        required: true,
        orderIndex: 0,
      },
      {
        name: 'Collection Date',
        dataType: 'date',
        required: true,
        orderIndex: 1,
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateWithFieldsItemDto)
  fields!: CreateTemplateWithFieldsItemDto[];
}
