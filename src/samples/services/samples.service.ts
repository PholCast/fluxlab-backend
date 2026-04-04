import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSampleDto } from '../dto/create-sample.dto';
import {
  CreateSampleWithValuesDto,
  CreateSampleWithValuesItemDto,
} from '../dto/create-sample-with-values.dto';
import { UpdateSampleDto } from '../dto/update-sample.dto';
import { UpdateSampleWithValuesDto } from '../dto/update-sample-with-values.dto';
import { Project } from '../../projects/entities/project.entity';
import { Field } from '../entities/field.entity';
import { SampleFieldValue } from '../entities/sample-field-value.entity';
import { Sample } from '../entities/sample.entity';
import { Template } from '../entities/template.entity';

@Injectable()
export class SamplesService {
  constructor(
    @InjectRepository(Sample)
    private readonly sampleRepository: Repository<Sample>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(createSampleDto: CreateSampleDto): Promise<Sample> {
    const template = await this.getTemplateOrThrow(createSampleDto.templateId);
    const project = await this.getProjectOrThrow(createSampleDto.projectId);

    await this.ensureCodeUniquePerProject(createSampleDto.code, project.id);

    const sample = this.sampleRepository.create({
      code: createSampleDto.code,
      // createdBy: createSampleDto.createdBy,
      status: createSampleDto.status ?? 'pending',
      template,
      project,
    });

    const savedSample = await this.sampleRepository.save(sample);
    return this.findOne(savedSample.id);
  }

  async findAll(): Promise<Sample[]> {
    return this.sampleRepository.find({
      relations: {
        template: {
          fields: true,
        },
        project: true,
        sampleFieldValues: {
          field: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async createWithValues(
    createSampleWithValuesDto: CreateSampleWithValuesDto,
  ): Promise<Sample> {
    const sampleId = await this.sampleRepository.manager.transaction(
      async (manager) => {
        const sampleRepository = manager.getRepository(Sample);
        const templateRepository = manager.getRepository(Template);
        const projectRepository = manager.getRepository(Project);
        const sampleFieldValueRepository = manager.getRepository(SampleFieldValue);

        const template = await this.getTemplateOrThrow(
          createSampleWithValuesDto.templateId,
          templateRepository,
        );

        const project = await this.getProjectOrThrow(
          createSampleWithValuesDto.projectId,
          projectRepository,
        );

        await this.ensureCodeUniquePerProject(
          createSampleWithValuesDto.code,
          project.id,
          undefined,
          sampleRepository,
        );

        const sample = sampleRepository.create({
          code: createSampleWithValuesDto.code,
          // createdBy: createSampleWithValuesDto.createdBy,
          status: createSampleWithValuesDto.status ?? 'pending',
          template,
          project,
        });

        const savedSample = await sampleRepository.save(sample);

        await this.validateAndCreateValues(
          createSampleWithValuesDto.values,
          template,
          savedSample,
          sampleFieldValueRepository,
        );

        return savedSample.id;
      },
    );

    return this.findOne(sampleId);
  }

  async findOne(id: string): Promise<Sample> {
    const sample = await this.sampleRepository
      .createQueryBuilder('sample')
      .leftJoinAndSelect('sample.template', 'template')
      .leftJoinAndSelect('template.fields', 'field')
      .leftJoinAndSelect('sample.project', 'project')
      .leftJoinAndSelect('sample.sampleFieldValues', 'sampleFieldValue')
      .leftJoinAndSelect('sampleFieldValue.field', 'sampleValueField')
      .where('sample.id = :id', { id })
      .orderBy('field.orderIndex', 'ASC')
      .addOrderBy('sampleFieldValue.id', 'ASC')
      .getOne();

    if (!sample) {
      throw new NotFoundException(`Sample with id ${id} was not found.`);
    }

    return sample;
  }

  async update(id: string, updateSampleDto: UpdateSampleDto): Promise<Sample> {
    const sample = await this.sampleRepository.findOne({
      where: { id },
      relations: {
        template: true,
        project: true,
      },
    });

    if (!sample) {
      throw new NotFoundException(`Sample with id ${id} was not found.`);
    }

    const nextTemplate = updateSampleDto.templateId
      ? await this.getTemplateOrThrow(updateSampleDto.templateId)
      : sample.template;

    const nextProject = updateSampleDto.projectId
      ? await this.getProjectOrThrow(updateSampleDto.projectId)
      : sample.project;

    const nextCode = updateSampleDto.code ?? sample.code;
    if (nextCode !== sample.code || nextProject.id !== sample.project.id) {
      await this.ensureCodeUniquePerProject(
        nextCode,
        nextProject.id,
        sample.id,
      );
    }

    sample.code = nextCode;
    // sample.createdBy = updateSampleDto.createdBy ?? sample.createdBy;
    sample.status = updateSampleDto.status ?? sample.status;
    sample.template = nextTemplate;
    sample.project = nextProject;

    await this.sampleRepository.save(sample);
    return this.findOne(sample.id);
  }

  async remove(id: string): Promise<void> {
    const sample = await this.sampleRepository.findOne({ where: { id } });

    if (!sample) {
      throw new NotFoundException(`Sample with id ${id} was not found.`);
    }

    await this.sampleRepository.remove(sample);
  }

  async updateWithValues(
    id: string,
    updateSampleWithValuesDto: UpdateSampleWithValuesDto,
  ): Promise<Sample> {
    const sample = await this.sampleRepository.findOne({
      where: { id },
      relations: { template: { fields: true } },
    });

    if (!sample) {
      throw new NotFoundException(`Sample with id ${id} was not found.`);
    }

    await this.sampleRepository.manager.transaction(async (manager) => {
      const sampleRepository = manager.getRepository(Sample);
      const sampleFieldValueRepository = manager.getRepository(SampleFieldValue);

      if (updateSampleWithValuesDto.status) {
        sample.status = updateSampleWithValuesDto.status;
        await sampleRepository.save(sample);
      }

      if (updateSampleWithValuesDto.values) {
        // First delete existing values
        await sampleFieldValueRepository.delete({ sample: { id: sample.id } });

        // Then validate and create new ones
        await this.validateAndCreateValues(
          updateSampleWithValuesDto.values,
          sample.template,
          sample,
          sampleFieldValueRepository,
        );
      }
    });

    return this.findOne(id);
  }

  private async getTemplateOrThrowWithRepository(
    templateId: string,
    templateRepository: Repository<Template>,
  ): Promise<Template> {
    const template = await templateRepository.findOne({
      where: { id: templateId },
      relations: {
        fields: true,
      },
    });

    if (!template) {
      throw new NotFoundException(
        `Template with id ${templateId} was not found.`,
      );
    }

    return template;
  }

  private async getTemplateOrThrow(
    templateId: string,
    templateRepository?: Repository<Template>,
  ): Promise<Template> {
    return this.getTemplateOrThrowWithRepository(
      templateId,
      templateRepository ?? this.templateRepository,
    );
  }

  private async getProjectOrThrow(
    projectId: string,
    projectRepository?: Repository<Project>,
  ): Promise<Project> {
    const project = await (projectRepository ?? this.projectRepository).findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with id ${projectId} was not found.`,
      );
    }

    return project;
  }

  private async ensureCodeUniquePerProject(
    code: string,
    projectId: string,
    ignoreSampleId?: string,
    sampleRepository?: Repository<Sample>,
  ): Promise<void> {
    const existingSample = await (sampleRepository ?? this.sampleRepository)
      .createQueryBuilder('sample')
      .leftJoin('sample.project', 'project')
      .where('sample.code = :code', { code })
      .andWhere('project.id = :projectId', { projectId })
      .andWhere(ignoreSampleId ? 'sample.id != :ignoreSampleId' : '1=1', {
        ignoreSampleId,
      })
      .getOne();

    if (existingSample) {
      throw new ConflictException(
        `Sample code ${code} already exists in project ${projectId}.`,
      );
    }
  }

  private async validateAndCreateValues(
    values: CreateSampleWithValuesItemDto[] | undefined,
    template: Template,
    sample: Sample,
    sampleFieldValueRepository: Repository<SampleFieldValue>,
  ): Promise<void> {
    if (!values || values.length === 0) {
      throw new BadRequestException(
        'values must be provided and contain at least one item for /samples/with-values.',
      );
    }

    const duplicatedFieldIds = this.getDuplicateFieldIds(values);
    if (duplicatedFieldIds.length > 0) {
      throw new BadRequestException(
        `Duplicate fieldId entries are not allowed: ${duplicatedFieldIds.join(', ')}.`,
      );
    }

    const templateFieldMap = new Map<string, Field>(
      template.fields.map((field) => [field.id, field]),
    );

    for (const valueItem of values) {
      if (!templateFieldMap.has(valueItem.fieldId)) {
        throw new BadRequestException(
          `Field ${valueItem.fieldId} does not belong to template ${template.id}.`,
        );
      }
    }

    const requiredTemplateFieldIds = template.fields
      .filter((field) => field.required)
      .map((field) => field.id);

    const providedFieldIds = new Set(values.map((value) => value.fieldId));
    const missingRequiredFieldIds = requiredTemplateFieldIds.filter(
      (fieldId) => !providedFieldIds.has(fieldId),
    );

    if (missingRequiredFieldIds.length > 0) {
      throw new BadRequestException(
        `Missing required field values for fields: ${missingRequiredFieldIds.join(', ')}.`,
      );
    }

    for (const valueItem of values) {
      const field = templateFieldMap.get(valueItem.fieldId);
      if (!field) {
        throw new BadRequestException(
          `Field ${valueItem.fieldId} does not belong to template ${template.id}.`,
        );
      }

      const valueType = this.getProvidedValueType(valueItem);
      this.ensureValueMatchesFieldDataType(field.dataType, valueType);

      const mappedValues = this.mapSampleFieldValueColumns(valueItem, valueType);
      const sampleFieldValue = sampleFieldValueRepository.create({
        sample,
        field,
        ...mappedValues,
      });

      await sampleFieldValueRepository.save(sampleFieldValue);
    }
  }

  private getDuplicateFieldIds(values: CreateSampleWithValuesItemDto[]): string[] {
    const fieldIdCount = new Map<string, number>();

    for (const value of values) {
      fieldIdCount.set(value.fieldId, (fieldIdCount.get(value.fieldId) ?? 0) + 1);
    }

    return [...fieldIdCount.entries()]
      .filter(([, count]) => count > 1)
      .map(([fieldId]) => fieldId);
  }

  private getProvidedValueType(
    value: CreateSampleWithValuesItemDto,
  ): 'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean' {
    const provided = (
      ['valueText', 'valueNumber', 'valueDate', 'valueBoolean'] as const
    ).filter((key) => value[key] !== undefined && value[key] !== null);

    if (provided.length !== 1) {
      throw new BadRequestException(
        'Exactly one value field must be provided: valueText, valueNumber, valueDate, or valueBoolean.',
      );
    }

    return provided[0];
  }

  private ensureValueMatchesFieldDataType(
    dataType: string,
    valueType: 'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean',
  ): void {
    const expectedValueMap: Record<
      string,
      'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean'
    > = {
      text: 'valueText',
      number: 'valueNumber',
      date: 'valueDate',
      boolean: 'valueBoolean',
    };

    const normalizedDataType = dataType.trim().toLowerCase();
    const expectedValueType = expectedValueMap[normalizedDataType];

    if (!expectedValueType) {
      throw new BadRequestException(
        `Unsupported field dataType ${dataType}. Allowed values are text, number, date, boolean.`,
      );
    }

    if (expectedValueType !== valueType) {
      throw new BadRequestException(
        `Field dataType ${normalizedDataType} requires ${expectedValueType} to be provided.`,
      );
    }
  }

  private mapSampleFieldValueColumns(
    value: CreateSampleWithValuesItemDto,
    valueType: 'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean',
  ): Pick<
    SampleFieldValue,
    'valueText' | 'valueNumber' | 'valueDate' | 'valueBoolean'
  > {
    const base = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueBoolean: null,
    };

    if (valueType === 'valueText') {
      return { ...base, valueText: value.valueText ?? null };
    }

    if (valueType === 'valueNumber') {
      return { ...base, valueNumber: value.valueNumber ?? null };
    }

    if (valueType === 'valueDate') {
      const parsedDate = new Date(value.valueDate ?? '');
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException('valueDate must be a valid date string.');
      }

      return {
        ...base,
        valueDate: parsedDate,
      };
    }

    return {
      ...base,
      valueBoolean: value.valueBoolean ?? null,
    };
  }
}
