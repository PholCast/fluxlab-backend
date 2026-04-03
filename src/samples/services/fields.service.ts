import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFieldDto } from '../dto/create-field.dto';
import { UpdateFieldDto } from '../dto/update-field.dto';
import { Field } from '../entities/field.entity';
import { SampleFieldValue } from '../entities/sample-field-value.entity';
import { Template } from '../entities/template.entity';

@Injectable()
export class FieldsService {
  constructor(
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async create(createFieldDto: CreateFieldDto): Promise<Field> {
    const template = await this.getTemplateOrThrow(createFieldDto.templateId);

    return this.fieldRepository.manager.transaction(async (manager) => {
      const managedFieldRepository = manager.getRepository(Field);
      const managedTemplateRepository = manager.getRepository(Template);

      const managedTemplate = await managedTemplateRepository.findOne({
        where: { id: template.id },
      });

      if (!managedTemplate) {
        throw new NotFoundException(
          `Template with id ${template.id} was not found.`,
        );
      }

      const totalFields = await managedFieldRepository.count({
        where: { template: { id: template.id } },
      });

      const clampedIndex = this.clampOrderIndex(
        createFieldDto.orderIndex,
        totalFields,
      );

      await this.shiftOrderIndexesForInsert(
        template.id,
        clampedIndex,
        managedFieldRepository,
      );

      const field = managedFieldRepository.create({
        name: createFieldDto.name,
        dataType: createFieldDto.dataType,
        required: createFieldDto.required,
        orderIndex: clampedIndex,
        template: managedTemplate,
      });

      const savedField = await managedFieldRepository.save(field);
      await this.normalizeFieldOrder(template.id, managedFieldRepository);

      const reloadedField = await managedFieldRepository.findOne({
        where: { id: savedField.id },
        relations: { template: true },
      });

      if (!reloadedField) {
        throw new NotFoundException(
          `Field with id ${savedField.id} was not found.`,
        );
      }

      return reloadedField;
    });
  }

  async findByTemplate(templateId: string): Promise<Field[]> {
    await this.getTemplateOrThrow(templateId);

    return this.fieldRepository.find({
      where: { template: { id: templateId } },
      relations: { template: true },
      order: { orderIndex: 'ASC' },
    });
  }

  async update(id: string, updateFieldDto: UpdateFieldDto): Promise<Field> {
    const existingField = await this.fieldRepository.findOne({
      where: { id },
      relations: { template: true },
    });

    if (!existingField) {
      throw new NotFoundException(`Field with id ${id} was not found.`);
    }

    if (
      updateFieldDto.templateId &&
      updateFieldDto.templateId !== existingField.template.id
    ) {
      throw new BadRequestException(
        'Field cannot be moved to another template.',
      );
    }

    return this.fieldRepository.manager.transaction(async (manager) => {
      const managedFieldRepository = manager.getRepository(Field);
      const managedSampleFieldValueRepository =
        manager.getRepository(SampleFieldValue);

      const field = await managedFieldRepository.findOne({
        where: { id },
        relations: { template: true },
      });

      if (!field) {
        throw new NotFoundException(`Field with id ${id} was not found.`);
      }

      if (updateFieldDto.dataType !== undefined) {
        const currentDataType = field.dataType.trim().toLowerCase();
        const nextDataType = updateFieldDto.dataType.trim().toLowerCase();

        if (nextDataType !== currentDataType) {
          const fieldValueCount = await managedSampleFieldValueRepository.count({
            where: { field: { id: field.id } },
          });

          if (fieldValueCount > 0) {
            throw new BadRequestException(
              'Field dataType cannot be updated because sample field values already exist for this field.',
            );
          }
        }
      }

      field.name = updateFieldDto.name ?? field.name;
      field.dataType = updateFieldDto.dataType ?? field.dataType;
      field.required = updateFieldDto.required ?? field.required;

      if (updateFieldDto.orderIndex !== undefined) {
        const totalFields = await managedFieldRepository.count({
          where: { template: { id: field.template.id } },
        });

        const targetOrderIndex = this.clampOrderIndex(
          updateFieldDto.orderIndex,
          totalFields - 1,
        );

        if (targetOrderIndex !== field.orderIndex) {
          const currentOrderIndex = field.orderIndex;
          const temporaryOrderIndex = await this.getTemporaryOrderIndex(
            field.template.id,
            managedFieldRepository,
          );

          field.orderIndex = temporaryOrderIndex;
          await managedFieldRepository.save(field);

          await this.shiftOrderIndexesForMove(
            field.template.id,
            currentOrderIndex,
            targetOrderIndex,
            managedFieldRepository,
          );

          field.orderIndex = targetOrderIndex;
        }
      }

      await managedFieldRepository.save(field);
      await this.normalizeFieldOrder(field.template.id, managedFieldRepository);

      const reloadedField = await managedFieldRepository.findOne({
        where: { id: field.id },
        relations: { template: true },
      });

      if (!reloadedField) {
        throw new NotFoundException(`Field with id ${field.id} was not found.`);
      }

      return reloadedField;
    });
  }

  async remove(id: string): Promise<void> {
    const field = await this.fieldRepository.findOne({
      where: { id },
      relations: { template: true },
    });

    if (!field) {
      throw new NotFoundException(`Field with id ${id} was not found.`);
    }

    await this.fieldRepository.manager.transaction(async (manager) => {
      const managedFieldRepository = manager.getRepository(Field);
      await managedFieldRepository.delete({ id });
      await this.normalizeFieldOrder(field.template.id, managedFieldRepository);
    });
  }

  private async getTemplateOrThrow(templateId: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
      select: { id: true, name: true, description: true, createdAt: true },
    });

    if (!template) {
      throw new NotFoundException(
        `Template with id ${templateId} was not found.`,
      );
    }

    return template;
  }

  private clampOrderIndex(orderIndex: number, max: number): number {
    if (orderIndex < 0) {
      return 0;
    }

    if (orderIndex > max) {
      return max;
    }

    return orderIndex;
  }

  private async normalizeFieldOrder(
    templateId: string,
    repository: Repository<Field>,
  ): Promise<void> {
    const fields = await repository.find({
      where: { template: { id: templateId } },
      order: { orderIndex: 'ASC', id: 'ASC' },
    });

    for (const [index, field] of fields.entries()) {
      if (field.orderIndex !== index) {
        field.orderIndex = index;
      }
    }

    if (fields.length > 0) {
      await repository.save(fields);
    }
  }

  private async shiftOrderIndexesForInsert(
    templateId: string,
    startIndex: number,
    repository: Repository<Field>,
  ): Promise<void> {
    const fieldsToShift = await repository.find({
      where: { template: { id: templateId } },
      order: { orderIndex: 'DESC', id: 'DESC' },
    });

    for (const field of fieldsToShift) {
      if (field.orderIndex >= startIndex) {
        field.orderIndex += 1;
        await repository.save(field);
      }
    }
  }

  private async shiftOrderIndexesForMove(
    templateId: string,
    fromIndex: number,
    toIndex: number,
    repository: Repository<Field>,
  ): Promise<void> {
    if (toIndex < fromIndex) {
      const fieldsToShift = await repository.find({
        where: { template: { id: templateId } },
        order: { orderIndex: 'DESC', id: 'DESC' },
      });

      for (const field of fieldsToShift) {
        if (field.orderIndex >= toIndex && field.orderIndex < fromIndex) {
          field.orderIndex += 1;
          await repository.save(field);
        }
      }

      return;
    }

    const fieldsToShift = await repository.find({
      where: { template: { id: templateId } },
      order: { orderIndex: 'ASC', id: 'ASC' },
    });

    for (const field of fieldsToShift) {
      if (field.orderIndex > fromIndex && field.orderIndex <= toIndex) {
        field.orderIndex -= 1;
        await repository.save(field);
      }
    }
  }

  private async getTemporaryOrderIndex(
    templateId: string,
    repository: Repository<Field>,
  ): Promise<number> {
    const result = await repository
      .createQueryBuilder('field')
      .select('MAX(field.order_index)', 'maxOrderIndex')
      .where('field.template_id = :templateId', { templateId })
      .getRawOne<{ maxOrderIndex: string | null }>();

    if (!result || result.maxOrderIndex === null) {
      return 0;
    }

    return Number(result.maxOrderIndex) + 1;
  }
}
