import { PartialType } from '@nestjs/swagger';
import { CreateTemplateWithFieldsDto } from './create-template-with-fields.dto';

export class UpdateTemplateWithFieldsDto extends PartialType(CreateTemplateWithFieldsDto) {}
