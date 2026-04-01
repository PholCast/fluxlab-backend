import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SamplesService } from './services/samples.service';
import { SamplesController } from './controllers/samples.controller';
import { Field } from './entities/field.entity';
import { SampleFieldValue } from './entities/sample-field-value.entity';
import { Sample } from './entities/sample.entity';
import { Template } from './entities/template.entity';
import { TemplatesService } from './services/templates.service';
import { TemplatesController } from './controllers/templates.controller';
import { FieldsController } from './controllers/fields.controller';
import { SampleFieldValuesController } from './controllers/sample-field-values.controller';
import { FieldsService } from './services/fields.service';
import { SampleFieldValuesService } from './services/sample-field-values.service';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sample,
      Template,
      Field,
      SampleFieldValue,
      Project,
    ]),
  ],
  controllers: [
    SamplesController,
    TemplatesController,
    FieldsController,
    SampleFieldValuesController,
  ],
  providers: [
    SamplesService,
    TemplatesService,
    FieldsService,
    SampleFieldValuesService,
  ],
  exports: [SamplesService],
})
export class SamplesModule {}
