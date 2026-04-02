import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSampleDto } from './create-sample.dto';

@ValidatorConstraint({ name: 'exactlyOneSampleValueField', async: false })
class ExactlyOneSampleValueFieldConstraint
  implements ValidatorConstraintInterface
{
  validate(_: unknown, args?: ValidationArguments): boolean {
    if (!args?.object) {
      return false;
    }

    const object = args.object as CreateSampleWithValuesItemDto;
    const values = [
      object.valueText,
      object.valueNumber,
      object.valueDate,
      object.valueBoolean,
    ];

    return (
      values.filter((value) => value !== undefined && value !== null).length ===
      1
    );
  }

  defaultMessage(): string {
    return 'Exactly one value field must be provided: valueText, valueNumber, valueDate, or valueBoolean.';
  }
}

export class CreateSampleWithValuesItemDto {
  @ApiProperty({ example: '5f37786f-ac32-440a-a8ae-6d74bb27d691' })
  @IsUUID()
  fieldId: string;

  @ApiPropertyOptional({ example: 'Within threshold' })
  @IsOptional()
  @IsString()
  valueText?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  valueNumber?: number;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  valueBoolean?: boolean;

  @Validate(ExactlyOneSampleValueFieldConstraint)
  private readonly _exactlyOneValueFieldRule = true;
}

export class CreateSampleWithValuesDto extends CreateSampleDto {
  @ApiPropertyOptional({
    type: CreateSampleWithValuesItemDto,
    isArray: true,
    example: [
      {
        fieldId: '5f37786f-ac32-440a-a8ae-6d74bb27d691',
        valueText: 'example',
      },
      {
        fieldId: 'f6d8ad2b-7bb8-417b-88dc-1f02745a77d9',
        valueNumber: 10,
      },
    ],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateSampleWithValuesItemDto)
  values?: CreateSampleWithValuesItemDto[];
}
