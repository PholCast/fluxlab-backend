import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateSampleDto } from '../dto/create-sample.dto';
import {
  CreateSampleWithValuesDto,
  CreateSampleWithValuesItemDto,
} from '../dto/create-sample-with-values.dto';
import { CreateSamplesWithValuesDto } from '../dto/create-samples-with-values.dto';
import { UpdateSampleWithValuesDto } from '../dto/update-sample-with-values.dto';
import {
  SamplesRepositoryProjectItemDto,
  SamplesRepositorySampleItemDto,
} from '../dto/sample-repository-response.dto';
import { UpdateSampleDto } from '../dto/update-sample.dto';
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

    let savedSample: Sample;
    try {
      savedSample = await this.sampleRepository.save(sample);
    } catch (error) {
      if (this.isCodePerProjectUniqueViolation(error)) {
        throw new ConflictException(
          await this.buildCodeAlreadyExistsMessage(createSampleDto.code, project.id),
        );
      }

      throw error;
    }

    return this.findOne(savedSample.id);
  }

  // async findAll(): Promise<Sample[]> {
  //   return this.sampleRepository.find({
  //     relations: {
  //       template: true,
  //       project: true,
  //     },
  //     order: {
  //       createdAt: 'DESC',
  //     },
  //   });
  // }

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

  async searchByCode(code: string): Promise<Sample[]> {
    if (!code?.trim()) {
      throw new BadRequestException('Se requiere el código de búsqueda.');
    }

    const normalizedCode = code.trim();

    return this.buildSampleDetailsQuery()
      .where('sample.code ILIKE :code', { code: `%${normalizedCode}%` })
      .getMany();
  }

  async findByClient(clientId: string): Promise<Sample[]> {
    return this.buildSampleDetailsQuery()
      .where('client.id = :clientId', { clientId })
      .getMany();
  }

  async findRepository(): Promise<SamplesRepositoryProjectItemDto[]> {
    const samples = await this.sampleRepository
      .createQueryBuilder('sample')
      .leftJoinAndSelect('sample.project', 'project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('sample.template', 'template')
      .leftJoinAndSelect('template.fields', 'field')
      .leftJoinAndSelect('sample.sampleFieldValues', 'sampleFieldValue')
      .leftJoinAndSelect('sampleFieldValue.field', 'sampleFieldValueField')
      .orderBy('project.name', 'ASC')
      .addOrderBy('template.name', 'ASC')
      .addOrderBy('field.orderIndex', 'ASC')
      .addOrderBy('sample.createdAt', 'DESC')
      .addOrderBy('sampleFieldValue.id', 'ASC')
      .getMany();

    const projectMap = new Map<string, SamplesRepositoryProjectItemDto>();

    for (const sample of samples) {
      const project = sample.project;
      const template = sample.template;

      if (!project || !template) {
        continue;
      }

      let projectItem = projectMap.get(project.id);

      if (!projectItem) {
        projectItem = {
          id: project.id,
          name: project.name,
          description: project.description,
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status,
          createdAt: project.createdAt,
          client: project.client
            ? {
                id: project.client.id,
                name: project.client.name,
              }
            : null,
          templates: [],
        };

        projectMap.set(project.id, projectItem);
      }

      let templateItem = projectItem.templates.find(
        (existingTemplate) => existingTemplate.id === template.id,
      );

      if (!templateItem) {
        templateItem = {
          id: template.id,
          name: template.name,
          fields: (template.fields ?? [])
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((field) => ({
              id: field.id,
              name: field.name,
              dataType: field.dataType,
              required: field.required,
              orderIndex: field.orderIndex,
            })),
          samples: [],
        };

        projectItem.templates.push(templateItem);
      }

      const sampleItem: SamplesRepositorySampleItemDto = {
        id: sample.id,
        code: sample.code,
        status: sample.status,
        createdAt: sample.createdAt,
        values: (sample.sampleFieldValues ?? []).map((sampleFieldValue) => ({
          id: sampleFieldValue.id,
          fieldId: sampleFieldValue.field?.id,
          valueText: sampleFieldValue.valueText,
          valueNumber: sampleFieldValue.valueNumber,
          valueDate: sampleFieldValue.valueDate,
          valueBoolean: sampleFieldValue.valueBoolean,
        })),
      };

      templateItem.samples.push(sampleItem);
    }

    return [...projectMap.values()];
  }

  private buildSampleDetailsQuery() {
    return this.sampleRepository
      .createQueryBuilder('sample')
      .leftJoinAndSelect('sample.template', 'template')
      .leftJoinAndSelect('template.fields', 'field')
      .leftJoinAndSelect('sample.project', 'project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('sample.sampleFieldValues', 'sampleFieldValue')
      .leftJoinAndSelect('sampleFieldValue.field', 'sampleValueField')
      .orderBy('sample.created_at', 'DESC')
      .addOrderBy('field.order_index', 'ASC')
      .addOrderBy('sampleFieldValue.id', 'ASC');
  }

  async createWithValues(
    createSampleWithValuesDto: CreateSampleWithValuesDto,
  ): Promise<Sample> {
    let sampleId: string;
    try {
      sampleId = await this.sampleRepository.manager.transaction(
        async (manager) => {
          const sampleRepository = manager.getRepository(Sample);
          const templateRepository = manager.getRepository(Template);
          const projectRepository = manager.getRepository(Project);
          const sampleFieldValueRepository = manager.getRepository(SampleFieldValue);

          return this.createWithValuesInTransaction(
            createSampleWithValuesDto,
            sampleRepository,
            templateRepository,
            projectRepository,
            sampleFieldValueRepository,
          );
        },
      );
    } catch (error) {
      if (this.isCodePerProjectUniqueViolation(error)) {
        throw new ConflictException(
          await this.buildCodeAlreadyExistsMessage(
            createSampleWithValuesDto.code,
            createSampleWithValuesDto.projectId,
          ),
        );
      }

      throw error;
    }

    return this.findOne(sampleId);
  }

  async createManyWithValues(
    createSamplesWithValuesDto: CreateSamplesWithValuesDto,
  ): Promise<Sample[]> {
    await this.ensureNoDuplicatedCodesInBulkRequest(createSamplesWithValuesDto.samples);

    const sampleIds = await this.sampleRepository.manager.transaction(
      async (manager) => {
        const sampleRepository = manager.getRepository(Sample);
        const templateRepository = manager.getRepository(Template);
        const projectRepository = manager.getRepository(Project);
        const sampleFieldValueRepository = manager.getRepository(SampleFieldValue);

        const createdSampleIds: string[] = [];

        for (const [index, sampleDto] of createSamplesWithValuesDto.samples.entries()) {
          try {
            const sampleId = await this.createWithValuesInTransaction(
              sampleDto,
              sampleRepository,
              templateRepository,
              projectRepository,
              sampleFieldValueRepository,
            );

            createdSampleIds.push(sampleId);
          } catch (error) {
            await this.throwBulkSampleError(error, index, sampleDto);
          }
        }

        return createdSampleIds;
      },
    );

    return Promise.all(sampleIds.map((sampleId) => this.findOne(sampleId)));
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
      throw new NotFoundException(`No se encontró la muestra con id ${id}.`);
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
      throw new NotFoundException(`No se encontró la muestra con id ${id}.`);
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


  async updateWithValues(
    id: string,
    updateSampleWithValuesDto: UpdateSampleWithValuesDto,
  ): Promise<Sample> {
    const sample = await this.sampleRepository.findOne({
      where: { id },
      relations: { template: { fields: true } },
    });

    if (!sample) {
      throw new NotFoundException(`No se encontró la muestra con id ${id}.`);
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

  async remove(id: string): Promise<void> {
    const sample = await this.sampleRepository.findOne({ where: { id } });

    if (!sample) {
      throw new NotFoundException(`No se encontró la muestra con id ${id}.`);
    }

    await this.sampleRepository.remove(sample);
  }

  async removeBulk(projectId: string, templateId: string): Promise<{ deleted: number }> {
    if (!projectId?.trim() || !templateId?.trim()) {
      throw new BadRequestException('projectId y templateId son obligatorios.');
    }

    await this.getProjectOrThrow(projectId);
    await this.getTemplateOrThrow(templateId);

    const result = await this.sampleRepository
      .createQueryBuilder()
      .delete()
      .from(Sample)
      .where('project_id = :projectId', { projectId })
      .andWhere('template_id = :templateId', { templateId })
      .execute();

    return { deleted: result.affected ?? 0 };
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
        `No se encontró la plantilla con id ${templateId}.`,
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
        `No se encontró el proyecto con id ${projectId}.`,
      );
    }

    return project;
  }

  private async createWithValuesInTransaction(
    createSampleWithValuesDto: CreateSampleWithValuesDto,
    sampleRepository: Repository<Sample>,
    templateRepository: Repository<Template>,
    projectRepository: Repository<Project>,
    sampleFieldValueRepository: Repository<SampleFieldValue>,
  ): Promise<string> {
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
  }

  private async ensureNoDuplicatedCodesInBulkRequest(
    samples: CreateSampleWithValuesDto[],
  ): Promise<void> {
    const uniqueKeySet = new Set<string>();
    const projectIdSet = new Set(samples.map((sample) => sample.projectId));
    const projectNameMap = await this.getProjectNameMapByIds([...projectIdSet]);

    for (const [index, sample] of samples.entries()) {
      const uniqueKey = `${sample.projectId}::${sample.code}`;

      if (uniqueKeySet.has(uniqueKey)) {
        const projectName = projectNameMap.get(sample.projectId) ?? sample.projectId;
        throw new ConflictException(
          `Se encontró el código duplicado ${sample.code} en la solicitud para el proyecto ${projectName} en el índice ${index}.`,
        );
      }

      uniqueKeySet.add(uniqueKey);
    }
  }

  private async throwBulkSampleError(
    error: unknown,
    index: number,
    sample: CreateSampleWithValuesDto,
  ): Promise<never> {
    const prefix = `La muestra en el índice ${index} con código ${sample.code} falló.`;

    if (this.isCodePerProjectUniqueViolation(error)) {
      throw new ConflictException(
        `${prefix} ${await this.buildCodeAlreadyExistsMessage(sample.code, sample.projectId)}`,
      );
    }

    if (error instanceof ConflictException) {
      throw new ConflictException(`${prefix} ${error.message}`);
    }

    if (error instanceof BadRequestException) {
      throw new BadRequestException(`${prefix} ${error.message}`);
    }

    if (error instanceof NotFoundException) {
      throw new NotFoundException(`${prefix} ${error.message}`);
    }

    throw error;
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
      throw new ConflictException(await this.buildCodeAlreadyExistsMessage(code, projectId));
    }
  }

  private async buildCodeAlreadyExistsMessage(code: string, projectId: string): Promise<string> {
    const projectName = await this.getProjectNameById(projectId);
    return `El código de muestra ${code} ya existe en el proyecto ${projectName}.`;
  }

  private async getProjectNameById(projectId: string): Promise<string> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: { name: true },
    });

    return project?.name ?? projectId;
  }

  private async getProjectNameMapByIds(projectIds: string[]): Promise<Map<string, string>> {
    if (projectIds.length === 0) {
      return new Map();
    }

    const projects = await this.projectRepository.find({
      where: projectIds.map((id) => ({ id })),
      select: { id: true, name: true },
    });

    return new Map(projects.map((project) => [project.id, project.name]));
  }

  private isCodePerProjectUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as
      | { code?: string; constraint?: string }
      | undefined;

    return (
      driverError?.code === '23505' &&
      driverError?.constraint === 'UQ_samples_project_code'
    );
  }

  private async validateAndCreateValues(
    values: CreateSampleWithValuesItemDto[] | undefined,
    template: Template,
    sample: Sample,
    sampleFieldValueRepository: Repository<SampleFieldValue>,
  ): Promise<void> {
    if (!values || values.length === 0) {
      throw new BadRequestException(
        'Se deben proporcionar valores y contener al menos un ítem para /samples/with-values.',
      );
    }

    const templateFieldMap = new Map<string, Field>(
      template.fields.map((field) => [field.id, field]),
    );

    const templateName = template.name ?? 'plantilla';
    const getFieldName = (fieldId: string) =>
      templateFieldMap.get(fieldId)?.name ?? 'campo desconocido';

    const duplicatedFieldIds = this.getDuplicateFieldIds(values);
    if (duplicatedFieldIds.length > 0) {
      const duplicatedFieldNames = duplicatedFieldIds.map(getFieldName);
      throw new BadRequestException(
        `No se permiten campos duplicados: ${duplicatedFieldNames.join(', ')}.`,
      );
    }

    for (const valueItem of values) {
      if (!templateFieldMap.has(valueItem.fieldId)) {
        throw new BadRequestException(
          `El ${getFieldName(valueItem.fieldId)} no pertenece a la plantilla ${templateName}.`,
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
      const missingRequiredFieldNames = missingRequiredFieldIds.map(getFieldName);
      throw new BadRequestException(
        `Faltan valores requeridos para los campos: ${missingRequiredFieldNames.join(', ')}.`,
      );
    }

    for (const valueItem of values) {
      const field = templateFieldMap.get(valueItem.fieldId);
      if (!field) {
        throw new BadRequestException(
          `El ${getFieldName(valueItem.fieldId)} no pertenece a la plantilla ${templateName}.`,
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
        'Se debe proporcionar exactamente uno de los siguientes campos: valueText, valueNumber, valueDate o valueBoolean.',
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
        `Tipo de dato de campo no soportado ${dataType}. Los valores permitidos son text, number, date, boolean.`,
      );
    }

    if (expectedValueType !== valueType) {
      throw new BadRequestException(
        `El dataType de campo ${normalizedDataType} requiere que se proporcione ${expectedValueType}.`,
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
        throw new BadRequestException('valueDate debe ser una cadena de fecha válida.');
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
