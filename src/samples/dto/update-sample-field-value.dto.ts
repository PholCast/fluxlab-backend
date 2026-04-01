import { PartialType } from '@nestjs/swagger';
import { CreateSampleFieldValueDto } from './create-sample-field-value.dto';

export class UpdateSampleFieldValueDto extends PartialType(
  CreateSampleFieldValueDto,
) {}
