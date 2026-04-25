import { Type } from 'class-transformer';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
	ArrayNotEmpty,
	IsArray,
	IsUUID,
	IsOptional,
	ValidateNested,
} from 'class-validator';
import {
	CreateTemplateWithFieldsItemDto,
} from './create-template-with-fields.dto';
import { CreateTemplateDto } from './create-template.dto';

export class UpdateTemplateWithFieldsItemDto extends CreateTemplateWithFieldsItemDto {
	@ApiPropertyOptional({
		example: 'f2f0a9f8-5c9a-4b3d-ae1d-4d8e9f919f25',
		description: 'Existing field identifier. Omit when creating a new field.',
	})
	@IsOptional()
	@IsUUID()
	id?: string;
}

export class UpdateTemplateWithFieldsDto extends PartialType(CreateTemplateDto) {
	@ApiPropertyOptional({
		type: UpdateTemplateWithFieldsItemDto,
		isArray: true,
		description:
			'Full list of fields for the template. Include id on existing fields to preserve associated sample values.',
	})
	@IsOptional()
	@IsArray()
	@ArrayNotEmpty()
	@ValidateNested({ each: true })
	@Type(() => UpdateTemplateWithFieldsItemDto)
	fields?: UpdateTemplateWithFieldsItemDto[];
}
