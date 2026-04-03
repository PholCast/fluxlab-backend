import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ROLES } from 'src/auth/roles';

export class UpdateUserRoleDto {
	@ApiProperty({ example: ROLES.USER, enum: Object.values(ROLES) })
	@IsString()
	@IsNotEmpty()
	@IsIn(Object.values(ROLES))
	role: string;
}