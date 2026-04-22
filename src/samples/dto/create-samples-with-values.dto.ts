import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateSampleWithValuesDto } from './create-sample-with-values.dto';

export class CreateSamplesWithValuesDto {
  @ApiProperty({
    type: CreateSampleWithValuesDto,
    isArray: true,
    example: [
      {
        code: 'SAMPLE-001',
        templateId: '5f37786f-ac32-440a-a8ae-6d74bb27d691',
        projectId: 'f6d8ad2b-7bb8-417b-88dc-1f02745a77d9',
        status: 'pending',
        values: [
          {
            fieldId: '9bb4f1df-67cb-4bbb-9c06-f0d9c53dc26f',
            valueText: 'Within threshold',
          },
        ],
      },
      {
        code: 'SAMPLE-002',
        templateId: '5f37786f-ac32-440a-a8ae-6d74bb27d691',
        projectId: 'f6d8ad2b-7bb8-417b-88dc-1f02745a77d9',
        status: 'pending',
        values: [
          {
            fieldId: '9bb4f1df-67cb-4bbb-9c06-f0d9c53dc26f',
            valueText: 'Out of range',
          },
        ],
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSampleWithValuesDto)
  samples: CreateSampleWithValuesDto[];
}
