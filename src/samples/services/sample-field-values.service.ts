import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSampleFieldValueDto } from '../dto/create-sample-field-value.dto';
import { UpdateSampleFieldValueDto } from '../dto/update-sample-field-value.dto';
import { Field } from '../entities/field.entity';
import { SampleFieldValue } from '../entities/sample-field-value.entity';
import { Sample } from '../entities/sample.entity';

@Injectable()
export class SampleFieldValuesService {
  constructor(
    @InjectRepository(SampleFieldValue)
    private readonly sampleFieldValueRepository: Repository<SampleFieldValue>,
    @InjectRepository(Sample)
    private readonly sampleRepository: Repository<Sample>,
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
  ) {}

  async create(
    createSampleFieldValueDto: CreateSampleFieldValueDto,
  ): Promise<SampleFieldValue> {
    const sample = await this.getSampleOrThrow(
      createSampleFieldValueDto.sampleId,
    );
    const field = await this.getFieldOrThrow(createSampleFieldValueDto.fieldId);

    this.ensureFieldBelongsToSampleTemplate(sample, field);

    const existingValue = await this.sampleFieldValueRepository.findOne({
      where: {
        sample: { id: sample.id },
        field: { id: field.id },
      },
      select: { id: true },
    });

    if (existingValue) {
      throw new ConflictException(
        'A value for this field and sample already exists.',
      );
    }

    const valueKey = this.getSingleValueKey(createSampleFieldValueDto);
    this.ensureValueMatchesDataType(field.dataType, valueKey);

    const sampleFieldValue = this.sampleFieldValueRepository.create({
      sample,
      field,
      ...this.mapValueColumns(valueKey, createSampleFieldValueDto[valueKey]),
    });

    return this.sampleFieldValueRepository.save(sampleFieldValue);
  }

  async findBySample(sampleId: string): Promise<SampleFieldValue[]> {
    await this.getSampleOrThrow(sampleId);

    return this.sampleFieldValueRepository
      .createQueryBuilder('sampleFieldValue')
      .leftJoinAndSelect('sampleFieldValue.field', 'field')
      .leftJoinAndSelect('sampleFieldValue.sample', 'sample')
      .where('sample.id = :sampleId', { sampleId })
      .orderBy('field.orderIndex', 'ASC')
      .getMany();
  }

  async update(
    id: string,
    updateSampleFieldValueDto: UpdateSampleFieldValueDto,
  ): Promise<SampleFieldValue> {
    const existingValue = await this.sampleFieldValueRepository.findOne({
      where: { id },
      relations: {
        sample: { template: true },
        field: { template: true },
      },
    });

    if (!existingValue) {
      throw new NotFoundException(
        `SampleFieldValue with id ${id} was not found.`,
      );
    }

    const nextSample = updateSampleFieldValueDto.sampleId
      ? await this.getSampleOrThrow(updateSampleFieldValueDto.sampleId)
      : existingValue.sample;

    const nextField = updateSampleFieldValueDto.fieldId
      ? await this.getFieldOrThrow(updateSampleFieldValueDto.fieldId)
      : existingValue.field;

    this.ensureFieldBelongsToSampleTemplate(nextSample, nextField);

    const duplicatedValue = await this.sampleFieldValueRepository
      .createQueryBuilder('sampleFieldValue')
      .leftJoin('sampleFieldValue.sample', 'sample')
      .leftJoin('sampleFieldValue.field', 'field')
      .where('sample.id = :sampleId', { sampleId: nextSample.id })
      .andWhere('field.id = :fieldId', { fieldId: nextField.id })
      .andWhere('sampleFieldValue.id != :id', { id })
      .getOne();

    if (duplicatedValue) {
      throw new ConflictException(
        'A value for this field and sample already exists.',
      );
    }

    const mergedPayload: UpdateSampleFieldValueDto = {
      valueText:
        updateSampleFieldValueDto.valueText !== undefined
          ? updateSampleFieldValueDto.valueText
          : (existingValue.valueText ?? undefined),
      valueNumber:
        updateSampleFieldValueDto.valueNumber !== undefined
          ? updateSampleFieldValueDto.valueNumber
          : (existingValue.valueNumber ?? undefined),
      valueDate:
        updateSampleFieldValueDto.valueDate !== undefined
          ? updateSampleFieldValueDto.valueDate
          : existingValue.valueDate
            ? this.toDateOnlyString(existingValue.valueDate)
            : undefined,
      valueBoolean:
        updateSampleFieldValueDto.valueBoolean !== undefined
          ? updateSampleFieldValueDto.valueBoolean
          : (existingValue.valueBoolean ?? undefined),
    };

    const valueKey = this.getSingleValueKey(mergedPayload);
    this.ensureValueMatchesDataType(nextField.dataType, valueKey);

    const nextColumns = this.mapValueColumns(valueKey, mergedPayload[valueKey]);

    existingValue.sample = nextSample;
    existingValue.field = nextField;
    existingValue.valueText = nextColumns.valueText;
    existingValue.valueNumber = nextColumns.valueNumber;
    existingValue.valueDate = nextColumns.valueDate;
    existingValue.valueBoolean = nextColumns.valueBoolean;

    return this.sampleFieldValueRepository.save(existingValue);
  }

  private async getSampleOrThrow(sampleId: string): Promise<Sample> {
    const sample = await this.sampleRepository.findOne({
      where: { id: sampleId },
      relations: { template: true },
    });

    if (!sample) {
      throw new NotFoundException(`Sample with id ${sampleId} was not found.`);
    }

    return sample;
  }

  private async getFieldOrThrow(fieldId: string): Promise<Field> {
    const field = await this.fieldRepository.findOne({
      where: { id: fieldId },
      relations: { template: true },
    });

    if (!field) {
      throw new NotFoundException(`Field with id ${fieldId} was not found.`);
    }

    return field;
  }

  private ensureFieldBelongsToSampleTemplate(
    sample: Sample,
    field: Field,
  ): void {
    if (sample.template.id !== field.template.id) {
      throw new BadRequestException(
        'The provided field does not belong to the sample template.',
      );
    }
  }

  private getSingleValueKey(
    dto: Pick<
      UpdateSampleFieldValueDto,
      'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean'
    >,
  ): 'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean' {
    const providedKeys = (
      ['valueText', 'valueNumber', 'valueDate', 'valueBoolean'] as const
    ).filter((key) => dto[key] !== undefined && dto[key] !== null);

    if (providedKeys.length !== 1) {
      throw new BadRequestException(
        'Exactly one value field must be provided: valueText, valueNumber, valueDate, or valueBoolean.',
      );
    }

    return providedKeys[0];
  }

  private ensureValueMatchesDataType(
    dataType: string,
    valueKey: 'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean',
  ): void {
    const map: Record<
      string,
      'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean'
    > = {
      text: 'valueText',
      number: 'valueNumber',
      date: 'valueDate',
      boolean: 'valueBoolean',
    };

    if (map[dataType] !== valueKey) {
      throw new BadRequestException(
        `Field dataType ${dataType} requires ${map[dataType]} to be set.`,
      );
    }
  }

  private mapValueColumns(
    valueKey: 'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean',
    value: string | number | boolean | undefined,
  ): Pick<
    SampleFieldValue,
    'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean'
  > {
    const baseValue = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueBoolean: null,
    };

    if (valueKey === 'valueText') {
      return { ...baseValue, valueText: value as string };
    }

    if (valueKey === 'valueNumber') {
      return { ...baseValue, valueNumber: value as number };
    }

    if (valueKey === 'valueDate') {
      return { ...baseValue, valueDate: new Date(value as string) };
    }

    return { ...baseValue, valueBoolean: value as boolean };
  }

  private toDateOnlyString(value: Date): string {
    return value.toISOString().split('T')[0];
  }
}
