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
import { CreateFieldDto } from '../dto/create-field.dto';
import { UpdateFieldDto } from '../dto/update-field.dto';
import { Field } from '../entities/field.entity';
import { FieldsService } from '../services/fields.service';

@ApiTags('fields')
@Controller('fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Post()
  @ApiOperation({ summary: 'Create field' })
  @ApiCreatedResponse({ type: Field })
  create(@Body() createFieldDto: CreateFieldDto): Promise<Field> {
    return this.fieldsService.create(createFieldDto);
  }

  @Get('template/:templateId')
  @ApiOperation({ summary: 'List fields by template' })
  @ApiParam({ name: 'templateId', format: 'uuid' })
  @ApiOkResponse({ type: Field, isArray: true })
  findByTemplate(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
  ): Promise<Field[]> {
    return this.fieldsService.findByTemplate(templateId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update field' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Field })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateFieldDto: UpdateFieldDto,
  ): Promise<Field> {
    return this.fieldsService.update(id, updateFieldDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete field' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Field deleted' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.fieldsService.remove(id);
  }
}
