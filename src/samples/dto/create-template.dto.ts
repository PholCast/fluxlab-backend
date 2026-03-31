import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Water Analysis Template' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'Template for standard water quality testing', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
