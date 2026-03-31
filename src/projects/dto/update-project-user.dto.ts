import { PartialType } from '@nestjs/swagger';
import { CreateProjectUserDto } from './create-project-user.dto';

export class UpdateProjectUserDto extends PartialType(CreateProjectUserDto) {}
