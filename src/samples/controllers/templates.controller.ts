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
import { TemplatesService } from '../services/templates.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { CreateTemplateWithFieldsDto } from '../dto/create-template-with-fields.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { UpdateTemplateWithFieldsDto } from '../dto/update-template-with-fields.dto';
import { Template } from '../entities/template.entity';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create template' })
  @ApiCreatedResponse({ type: Template })
  create(@Body() createTemplateDto: CreateTemplateDto): Promise<Template> {
    return this.templatesService.create(createTemplateDto);
  }

  @Post('with-fields')
  @ApiOperation({ summary: 'Create template with fields in one transaction' })
  @ApiCreatedResponse({ type: Template })
  createWithFields(
    @Body() createTemplateWithFieldsDto: CreateTemplateWithFieldsDto,
  ): Promise<Template> {
    return this.templatesService.createWithFields(createTemplateWithFieldsDto);
  }

  @Get()
  @ApiOperation({ summary: 'List templates' })
  @ApiOkResponse({ type: Template, isArray: true })
  findAll(): Promise<Template[]> {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template with ordered fields' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Template })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Template> {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Template })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateTemplateDto: UpdateTemplateWithFieldsDto,
  ): Promise<Template> {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Template deleted' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.templatesService.remove(id);
  }
}
