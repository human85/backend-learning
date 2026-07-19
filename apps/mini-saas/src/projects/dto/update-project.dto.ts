import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PROJECT_NAME_MAX_LENGTH } from '../project.constants';

export class UpdateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_NAME_MAX_LENGTH)
  name!: string;
}
