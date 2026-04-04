import { ApiProperty } from '@nestjs/swagger';

export class SamplesRepositoryValueItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  fieldId!: string;

  @ApiProperty({ nullable: true })
  valueText!: string | null;

  @ApiProperty({ nullable: true })
  valueNumber!: number | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  valueDate!: Date | null;

  @ApiProperty({ nullable: true })
  valueBoolean!: boolean | null;
}

export class SamplesRepositorySampleItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: () => [SamplesRepositoryValueItemDto] })
  values!: SamplesRepositoryValueItemDto[];
}

export class SamplesRepositoryTemplateFieldItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  dataType!: string;

  @ApiProperty()
  required!: boolean;

  @ApiProperty()
  orderIndex!: number;
}

export class SamplesRepositoryTemplateItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: () => [SamplesRepositoryTemplateFieldItemDto] })
  fields!: SamplesRepositoryTemplateFieldItemDto[];

  @ApiProperty({ type: () => [SamplesRepositorySampleItemDto] })
  samples!: SamplesRepositorySampleItemDto[];
}

export class SamplesRepositoryProjectClientDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class SamplesRepositoryProjectItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  startDate!: Date | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  endDate!: Date | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    type: () => SamplesRepositoryProjectClientDto,
    nullable: true,
  })
  client!: SamplesRepositoryProjectClientDto | null;

  @ApiProperty({ type: () => [SamplesRepositoryTemplateItemDto] })
  templates!: SamplesRepositoryTemplateItemDto[];
}
