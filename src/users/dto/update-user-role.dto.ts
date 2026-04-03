import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ROLES } from 'src/auth/roles';

/**
 * DTO for updating user role
 * Admin only - used to change user roles
 */
export class UpdateUserRoleDto {
  @ApiProperty({ example: ROLES.USER, enum: Object.values(ROLES) })
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(ROLES))
  role: string;
}