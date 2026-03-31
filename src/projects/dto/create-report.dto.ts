import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ example: 'Final Quality Report' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title: string;

  @ApiProperty({ example: 'Detailed final report for batch QC', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'draft', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiProperty({ example: 'a5076f2a-7e7b-4978-99bb-7068e7f7f7e6' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '8e6682e1-3106-4ba2-aec9-d9ec8228fe2c' })
  @IsUUID()
  createdById: string;
}
