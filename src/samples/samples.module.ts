import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SamplesService } from './samples.service';
import { SamplesController } from './samples.controller';
import { Field } from './entities/field.entity';
import { SampleFieldValue } from './entities/sample-field-value.entity';
import { Sample } from './entities/sample.entity';
import { Template } from './entities/template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sample, Template, Field, SampleFieldValue])],
  controllers: [SamplesController],
  providers: [SamplesService],
  exports: [SamplesService],
})
export class SamplesModule {}
