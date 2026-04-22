import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {
	@IsOptional()
	@IsString()
	@MaxLength(40)
	@Matches(/^(?=.*\d)\+?[\d\s]+$/, {
		message: 'phoneNumber must contain digits, spaces, and optional leading +',
	})
	phoneNumber?: string | null;
}
