import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AssociateClientProjectsDto {
  @ApiProperty({ example: '3f7da128-cadf-4bd8-9a2a-5581d1fcb1d7' })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    example: [
      'a5076f2a-7e7b-4978-99bb-7068e7f7f7e6',
      'd5bf758c-b31f-4cc8-a265-2af81dd95dc1',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  projectIds: string[];
}
