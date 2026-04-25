import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, QueryFailedError, Repository } from 'typeorm';
import { FIELD_DATA_TYPES } from '../constants/sample.constants';
import { CreateTemplateDto } from '../dto/create-template.dto';
import {
  CreateTemplateWithFieldsDto,
  CreateTemplateWithFieldsItemDto,
} from '../dto/create-template-with-fields.dto';
import {
  UpdateTemplateWithFieldsDto,
  UpdateTemplateWithFieldsItemDto,
} from '../dto/update-template-with-fields.dto';
import { Field } from '../entities/field.entity';
import { Sample } from '../entities/sample.entity';
import { SampleFieldValue } from '../entities/sample-field-value.entity';
import { Template } from '../entities/template.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<Template> {
    await this.ensureNameIsUnique(createTemplateDto.name);

    const template = this.templateRepository.create({
      name: createTemplateDto.name,
      description: createTemplateDto.description ?? null,
    });

    return this.templateRepository.save(template);
  }

  async createWithFields(
    createTemplateWithFieldsDto: CreateTemplateWithFieldsDto,
  ): Promise<Template> {
    const createdTemplateId = await this.templateRepository.manager.transaction(
      async (manager) => {
        const templateRepository = manager.getRepository(Template);
        const fieldRepository = manager.getRepository(Field);

        await this.ensureNameIsUnique(
          createTemplateWithFieldsDto.name,
          templateRepository,
        );

        const normalizedFields = this.validateAndNormalizeCreateFields(
          createTemplateWithFieldsDto.fields,
        );

        const template = templateRepository.create({
          name: createTemplateWithFieldsDto.name,
          description: createTemplateWithFieldsDto.description ?? null,
        });

        const savedTemplate = await templateRepository.save(template);

        const fieldsToSave = normalizedFields.map((field) =>
          fieldRepository.create({
            name: field.name,
            dataType: field.dataType,
            required: field.required,
            orderIndex: field.orderIndex,
            template: savedTemplate,
          }),
        );

        await fieldRepository.save(fieldsToSave);

        return savedTemplate.id;
      },
    );

    return this.findOne(createdTemplateId);
  }

  async findAll(): Promise<Template[]> {
    return this.templateRepository.find({
      relations: { fields: true },
      order: { 
        createdAt: 'DESC',
        fields: { orderIndex: 'ASC' }
      },
    });
  }

  async searchByName(name: string): Promise<Template[]> {
    if (!name?.trim()) {
      throw new BadRequestException('Name query is required.');
    }

    const normalizedName = name.trim();

    return this.templateRepository.find({
      where: {
        name: ILike(`%${normalizedName}%`),
      },
      relations: { fields: true },
      order: {
        name: 'ASC',
        fields: { orderIndex: 'ASC' },
      },
    });
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.fields', 'field')
      .where('template.id = :id', { id })
      .orderBy('field.orderIndex', 'ASC')
      .getOne();

    if (!template) {
      throw new NotFoundException(`Template with id ${id} was not found.`);
    }

    return template;
  }

  async update(
    id: string,
    updateTemplateDto: UpdateTemplateWithFieldsDto,
  ): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: { fields: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with id ${id} was not found.`);
    }

    if (updateTemplateDto.name && updateTemplateDto.name !== template.name) {
      const templateRepo = this.templateRepository;
      await this.ensureNameIsUnique(updateTemplateDto.name, templateRepo);
    }

    const updatedTemplateId = await this.templateRepository.manager.transaction(
      async (manager) => {
        const templateRepo = manager.getRepository(Template);
        const fieldRepo = manager.getRepository(Field);
        const sampleFieldValueRepository = manager.getRepository(SampleFieldValue);

        // Update basic info
        template.name = updateTemplateDto.name ?? template.name;
        template.description =
          updateTemplateDto.description ?? template.description;
        await templateRepo.save(template);

        // If fields are provided, update non-destructively to preserve existing field IDs.
        if (updateTemplateDto.fields) {
          const normalizedFields = this.validateAndNormalizeUpdateFields(
            updateTemplateDto.fields,
          );

          const existingFields = await fieldRepo.find({
            where: { template: { id: template.id } },
            order: { orderIndex: 'ASC' },
          });

          const existingFieldsById = new Map(
            existingFields.map((existingField) => [existingField.id, existingField]),
          );
          const claimedExistingFieldIds = new Set<string>();
          const fieldsToSave: Field[] = [];

          for (const normalizedField of normalizedFields) {
            const existingField = this.resolveExistingFieldForUpdate(
              normalizedField,
              existingFields,
              existingFieldsById,
              claimedExistingFieldIds,
            );

            if (existingField) {
              claimedExistingFieldIds.add(existingField.id);
              existingField.name = normalizedField.name;
              existingField.dataType = normalizedField.dataType;
              existingField.required = normalizedField.required;
              existingField.orderIndex = normalizedField.orderIndex;
              fieldsToSave.push(existingField);
              continue;
            }

            fieldsToSave.push(
              fieldRepo.create({
                name: normalizedField.name,
                dataType: normalizedField.dataType,
                required: normalizedField.required,
                orderIndex: normalizedField.orderIndex,
                template,
              }),
            );
          }

          const fieldsToRemove = existingFields.filter(
            (existingField) => !claimedExistingFieldIds.has(existingField.id),
          );

          if (fieldsToRemove.length > 0) {
            const removedFieldIds = fieldsToRemove.map((field) => field.id);

            const associatedSampleValues = await sampleFieldValueRepository
              .createQueryBuilder('sampleFieldValue')
              .where('sampleFieldValue.field_id IN (:...fieldIds)', {
                fieldIds: removedFieldIds,
              })
              .getCount();

            if (associatedSampleValues > 0) {
              throw new ConflictException(
                'No se puede eliminar uno o mas campos porque ya tienen valores asociados en muestras. Mantenga esos campos o migre la informacion antes de guardarla.',
              );
            }

            await fieldRepo.remove(fieldsToRemove);
          }

          if (fieldsToSave.length > 0) {
            await fieldRepo.save(fieldsToSave);
          }
        }

        return template.id;
      },
    );

    return this.findOne(updatedTemplateId);
  }

  async remove(id: string): Promise<void> {
    const template = await this.templateRepository.findOne({ where: { id } });

    if (!template) {
      throw new NotFoundException(`Template with id ${id} was not found.`);
    }
    const sampleRepository = this.templateRepository.manager.getRepository(Sample);
    const associatedSamplesCount = await sampleRepository.count({
      where: { template: { id } },
    });

    if (associatedSamplesCount > 0) {
      const samplesLabel =
        associatedSamplesCount === 1 ? 'muestra asociada' : 'muestras asociadas';

      throw new ConflictException(
        `No se puede eliminar la plantilla porque tiene ${associatedSamplesCount} ${samplesLabel}. Elimina esas muestras primero.`,
      );
    }

    try {
      await this.templateRepository.remove(template);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ConflictException(
          'No se puede eliminar la plantilla porque tiene muestras asociadas. Elimina esas muestras primero.',
        );
      }
      throw error;
    }
  }

  private async ensureNameIsUnique(
    name: string,
    templateRepository?: Repository<Template>,
  ): Promise<void> {
    const existingTemplate = await (templateRepository ?? this.templateRepository).findOne({
      where: { name },
      select: { id: true },
    });

    if (existingTemplate) {
      throw new ConflictException(`Template name ${name} already exists.`);
    }
  }

  private validateAndNormalizeCreateFields(
    fields: CreateTemplateWithFieldsItemDto[],
  ): CreateTemplateWithFieldsItemDto[] {
    if (!fields || fields.length === 0) {
      throw new BadRequestException('fields must be provided and cannot be empty.');
    }

    const normalizedNameMap = new Map<string, number>();
    const orderIndexMap = new Map<number, number>();

    fields.forEach((field, index) => {
      const normalizedName = field.name.trim().toLowerCase();
      if (normalizedNameMap.has(normalizedName)) {
        throw new BadRequestException(
          `Duplicate field name detected: ${field.name}.`,
        );
      }
      normalizedNameMap.set(normalizedName, index);

      if (orderIndexMap.has(field.orderIndex)) {
        throw new BadRequestException(
          `Duplicate orderIndex detected: ${field.orderIndex}.`,
        );
      }
      orderIndexMap.set(field.orderIndex, index);

      const normalizedDataType = field.dataType.trim().toLowerCase();
      if (!FIELD_DATA_TYPES.includes(normalizedDataType as (typeof FIELD_DATA_TYPES)[number])) {
        throw new BadRequestException(
          `Unsupported dataType ${field.dataType}. Allowed values are: ${FIELD_DATA_TYPES.join(', ')}.`,
        );
      }
    });

    return [...fields]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((field, index) => ({
        ...field,
        name: field.name.trim(),
        dataType: field.dataType.trim().toLowerCase(),
        orderIndex: index,
      }));
  }

  private validateAndNormalizeUpdateFields(
    fields: UpdateTemplateWithFieldsItemDto[],
  ): UpdateTemplateWithFieldsItemDto[] {
    if (!fields || fields.length === 0) {
      throw new BadRequestException('fields must be provided and cannot be empty.');
    }

    const normalizedNameMap = new Map<string, number>();
    const orderIndexMap = new Map<number, number>();
    const fieldIdMap = new Map<string, number>();

    fields.forEach((field, index) => {
      const normalizedName = field.name.trim().toLowerCase();
      if (normalizedNameMap.has(normalizedName)) {
        throw new BadRequestException(
          `Duplicate field name detected: ${field.name}.`,
        );
      }
      normalizedNameMap.set(normalizedName, index);

      if (orderIndexMap.has(field.orderIndex)) {
        throw new BadRequestException(
          `Duplicate orderIndex detected: ${field.orderIndex}.`,
        );
      }
      orderIndexMap.set(field.orderIndex, index);

      if (field.id) {
        const normalizedFieldId = field.id.trim();
        if (fieldIdMap.has(normalizedFieldId)) {
          throw new BadRequestException(
            `Duplicate field id detected: ${field.id}.`,
          );
        }
        fieldIdMap.set(normalizedFieldId, index);
      }

      const normalizedDataType = field.dataType.trim().toLowerCase();
      if (!FIELD_DATA_TYPES.includes(normalizedDataType as (typeof FIELD_DATA_TYPES)[number])) {
        throw new BadRequestException(
          `Unsupported dataType ${field.dataType}. Allowed values are: ${FIELD_DATA_TYPES.join(', ')}.`,
        );
      }
    });

    return [...fields]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((field, index) => ({
        ...field,
        id: field.id?.trim() || undefined,
        name: field.name.trim(),
        dataType: field.dataType.trim().toLowerCase(),
        orderIndex: index,
      }));
  }

  private resolveExistingFieldForUpdate(
    field: UpdateTemplateWithFieldsItemDto,
    existingFields: Field[],
    existingFieldsById: Map<string, Field>,
    claimedExistingFieldIds: Set<string>,
  ): Field | null {
    if (field.id) {
      const existingField = existingFieldsById.get(field.id);

      if (!existingField) {
        throw new BadRequestException(
          `Field ${field.id} does not belong to the selected template.`,
        );
      }

      if (claimedExistingFieldIds.has(existingField.id)) {
        throw new BadRequestException(`Field ${field.id} is duplicated in the request.`);
      }

      return existingField;
    }

    const normalizedIncomingName = field.name.trim().toLowerCase();

    const matchingFieldByName = existingFields.find(
      (existingField) =>
        !claimedExistingFieldIds.has(existingField.id) &&
        existingField.name.trim().toLowerCase() === normalizedIncomingName,
    );

    return matchingFieldByName ?? null;
  }
}
