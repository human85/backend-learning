import { ApiProperty } from '@nestjs/swagger';
import { PROJECT_NAME_MAX_LENGTH } from '../project.constants';

export class ProjectResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({
    example: 'Launch website',
    maxLength: PROJECT_NAME_MAX_LENGTH,
  })
  name!: string;

  @ApiProperty({ example: 1 })
  ownerId!: number;
}
