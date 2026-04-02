import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SAMPLE_STATUSES } from '../constants/sample.constants';

export class CreateSampleDto {
  @ApiProperty({ example: 'SMP-2026-0001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  code: string;

  @ApiProperty({ example: '3f7da128-cadf-4bd8-9a2a-5581d1fcb1d7' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ example: 'a5076f2a-7e7b-4978-99bb-7068e7f7f7e6' })
  @IsUUID()
  projectId: string;

  // @ApiProperty({ example: 'lab.tech@fluxlab.io' })
  // @IsString()
  // @IsNotEmpty()
  // @MaxLength(120)
  // createdBy: string;

  @ApiProperty({ example: 'pending', required: false })
  @IsOptional()
  @IsString()
  @IsIn(SAMPLE_STATUSES)
  @MaxLength(50)
  status?: string;
}
