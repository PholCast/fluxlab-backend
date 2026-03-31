import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateProjectUserDto {
  @ApiProperty({ example: 'a5076f2a-7e7b-4978-99bb-7068e7f7f7e6' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '8e6682e1-3106-4ba2-aec9-d9ec8228fe2c' })
  @IsUUID()
  userId: string;
}
