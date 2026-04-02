import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateProjectStatusDto {
  @ApiProperty({ example: 'completed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  status: string;

  @ApiProperty({
    example: '3f7da128-cadf-4bd8-9a2a-5581d1fcb1d7',
    required: false,
    description: 'Optional segmentation scope by client',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;
}
