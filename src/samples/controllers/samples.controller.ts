import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { SamplesService } from '../services/samples.service';
import { CreateSampleDto } from '../dto/create-sample.dto';
import { CreateSampleWithValuesDto } from '../dto/create-sample-with-values.dto';
import { SamplesRepositoryProjectItemDto } from '../dto/sample-repository-response.dto';
import { UpdateSampleDto } from '../dto/update-sample.dto';
import { UpdateSampleWithValuesDto } from '../dto/update-sample-with-values.dto';
import { Sample } from '../entities/sample.entity';

@ApiTags('samples')
@Controller('samples')
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  @Post()
  @ApiOperation({ summary: 'Create sample' })
  @ApiCreatedResponse({ type: Sample })
  create(@Body() createSampleDto: CreateSampleDto): Promise<Sample> {
    return this.samplesService.create(createSampleDto);
  }

  @Post('with-values')
  @ApiOperation({ summary: 'Create sample with values in one transaction' })
  @ApiCreatedResponse({ type: Sample })
  createWithValues(
    @Body() createSampleWithValuesDto: CreateSampleWithValuesDto,
  ): Promise<Sample> {
    return this.samplesService.createWithValues(createSampleWithValuesDto);
  }

  @Get()
  @ApiOperation({ summary: 'List samples' })
  @ApiOkResponse({ type: Sample, isArray: true })
  findAll(): Promise<Sample[]> {
    return this.samplesService.findAll();
  }

  @Get('repository')
  @ApiOperation({ summary: 'List samples grouped by project and template' })
  @ApiOkResponse({ type: SamplesRepositoryProjectItemDto, isArray: true })
  findRepository(): Promise<SamplesRepositoryProjectItemDto[]> {
    return this.samplesService.findRepository();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sample with template and values' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Sample })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Sample> {
    return this.samplesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sample' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Sample })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateSampleDto: UpdateSampleDto,
  ): Promise<Sample> {
    return this.samplesService.update(id, updateSampleDto);
  }

  @Patch(':id/with-values')
  @ApiOperation({ summary: 'Update sample with attributes and values' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Sample })
  updateWithValues(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateSampleWithValuesDto: UpdateSampleWithValuesDto,
  ): Promise<Sample> {
    return this.samplesService.updateWithValues(id, updateSampleWithValuesDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete sample' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Sample deleted' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.samplesService.remove(id);
  }
}
