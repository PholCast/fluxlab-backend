import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * DTO for updating user data (name, email)
 * Used by users to update their own profile
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
