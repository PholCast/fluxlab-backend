import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSampleFieldValueDto {
  @ApiProperty({ example: 'd5bf758c-b31f-4cc8-a265-2af81dd95dc1' })
  @IsUUID()
  sampleId: string;

  @ApiProperty({ example: '5f37786f-ac32-440a-a8ae-6d74bb27d691' })
  @IsUUID()
  fieldId: string;

  @ApiProperty({ example: 'Within threshold', required: false })
  @IsOptional()
  @IsString()
  valueText?: string;

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsInt()
  valueNumber?: number;

  @ApiProperty({ example: '2026-03-31', required: false })
  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @ApiProperty({
    example: 'U3RhdGljIGJhc2U2NCBkYXRh',
    required: false,
    description: 'Base64-encoded binary payload',
  })
  @IsOptional()
  @IsString()
  valueBinary?: string;
}
