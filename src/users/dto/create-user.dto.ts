import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
	@ApiProperty({ example: 'Ana Martinez' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	name: string;

	@ApiProperty({ example: 'ana@fluxlab.io' })
	@IsEmail()
	email: string;

	@ApiProperty({ example: 'S3curePass123!' })
	@IsString()
	@MinLength(8)
	@MaxLength(255)
	password: string;

	@ApiProperty({ example: 'analyst' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(50)
	role: string;

	@ApiProperty({ example: true, required: false })
	@IsOptional()
	@IsBoolean()
	active?: boolean;
}
