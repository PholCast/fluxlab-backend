import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSampleFieldValueDto } from '../dto/create-sample-field-value.dto';
import { UpdateSampleFieldValueDto } from '../dto/update-sample-field-value.dto';
import { SampleFieldValue } from '../entities/sample-field-value.entity';
import { SampleFieldValuesService } from '../services/sample-field-values.service';

@ApiTags('sample-field-values')
@Controller('sample-field-values')
export class SampleFieldValuesController {
  constructor(
    private readonly sampleFieldValuesService: SampleFieldValuesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create sample field value' })
  @ApiCreatedResponse({ type: SampleFieldValue })
  create(
    @Body() createSampleFieldValueDto: CreateSampleFieldValueDto,
  ): Promise<SampleFieldValue> {
    return this.sampleFieldValuesService.create(createSampleFieldValueDto);
  }

  @Get('sample/:sampleId')
  @ApiOperation({ summary: 'List values by sample' })
  @ApiParam({ name: 'sampleId', format: 'uuid' })
  @ApiOkResponse({ type: SampleFieldValue, isArray: true })
  findBySample(
    @Param('sampleId', new ParseUUIDPipe()) sampleId: string,
  ): Promise<SampleFieldValue[]> {
    return this.sampleFieldValuesService.findBySample(sampleId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sample field value' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SampleFieldValue })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateSampleFieldValueDto: UpdateSampleFieldValueDto,
  ): Promise<SampleFieldValue> {
    return this.sampleFieldValuesService.update(id, updateSampleFieldValueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete sample field value' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Sample field value deleted' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.sampleFieldValuesService.remove(id);
  }
}
