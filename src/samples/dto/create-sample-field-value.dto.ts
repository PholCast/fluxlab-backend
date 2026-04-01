import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidationArguments,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'exactlyOneValueField', async: false })
class ExactlyOneValueFieldConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args?: ValidationArguments): boolean {
    if (!args?.object) {
      return false;
    }

    const object = args.object as CreateSampleFieldValueDto;
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

export class CreateSampleFieldValueDto {
  @ApiProperty({ example: 'd5bf758c-b31f-4cc8-a265-2af81dd95dc1' })
  @IsNotEmpty()
  @IsUUID()
  sampleId: string;

  @ApiProperty({ example: '5f37786f-ac32-440a-a8ae-6d74bb27d691' })
  @IsNotEmpty()
  @IsUUID()
  fieldId: string;

  @ApiProperty({ example: 'Within threshold', required: false })
  @IsOptional()
  @IsString()
  valueText?: string;

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsInt()
  valueNumber?: number;

  @ApiProperty({ example: '2026-03-31', required: false })
  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  valueBoolean?: boolean;

  @ApiHideProperty()
  @Validate(ExactlyOneValueFieldConstraint)
  private readonly _exactlyOneValueFieldRule = true;
}
