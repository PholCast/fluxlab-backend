import { ApiProperty } from '@nestjs/swagger';
import {
	IsDateString,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
} from 'class-validator';

export class CreateProjectDto {
	@ApiProperty({ example: 'Quality Control - Batch 2026-Q2' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(150)
	name: string;

	@ApiProperty({ example: 'Validation workflow for incoming samples', required: false })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({ example: '2026-03-01', required: false })
	@IsOptional()
	@IsDateString()
	startDate?: string;

	@ApiProperty({ example: '2026-06-30', required: false })
	@IsOptional()
	@IsDateString()
	endDate?: string;

	@ApiProperty({ example: 'active', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(50)
	status?: string;

	@ApiProperty({ example: '3f7da128-cadf-4bd8-9a2a-5581d1fcb1d7', required: false })
	@IsOptional()
	@IsUUID()
	clientId?: string;
}
