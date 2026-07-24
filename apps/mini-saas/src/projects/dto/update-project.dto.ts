import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PROJECT_NAME_MAX_LENGTH } from '../project.constants';

export class UpdateProjectDto {
  @ApiProperty({
    example: 'Launch mobile app',
    maxLength: PROJECT_NAME_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_NAME_MAX_LENGTH)
  name!: string;
}
