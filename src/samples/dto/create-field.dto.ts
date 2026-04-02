import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { FIELD_DATA_TYPES } from '../constants/sample.constants';

export class CreateFieldDto {
  @ApiProperty({ example: '3f7da128-cadf-4bd8-9a2a-5581d1fcb1d7' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ example: 'pH Level' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'number' })
  @IsString()
  @IsNotEmpty()
  @IsIn(FIELD_DATA_TYPES)
  @MaxLength(40)
  dataType: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  orderIndex: number;
}
