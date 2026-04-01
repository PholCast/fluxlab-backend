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

@Module({
  imports: [TypeOrmModule.forFeature([Sample, Template, Field, SampleFieldValue])],
  controllers: [SamplesController, TemplatesController],
  providers: [SamplesService, TemplatesService],
  exports: [SamplesService],
})
export class SamplesModule {}
