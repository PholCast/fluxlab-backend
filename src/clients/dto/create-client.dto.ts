import { ApiProperty } from '@nestjs/swagger';
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
} from 'class-validator';

export class CreateClientDto {
	@ApiProperty({ example: 'Acme Biotech' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(150)
	name: string;

	@ApiProperty({ example: 'contact@acmebio.com' })
	@IsEmail()
	email: string;

	@ApiProperty({ example: '+1 555 000 1111', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(40)
	@Matches(/^(?=.*\d)\+?[\d\s]+$/, {
		message: 'phoneNumber must contain digits, spaces, and optional leading +',
	})
	phoneNumber?: string | null;

	@ApiProperty({ example: 'active', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(50)
	status?: string;

	@ApiProperty({ example: '742 Evergreen Avenue', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	address?: string;
}
