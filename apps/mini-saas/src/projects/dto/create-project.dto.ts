import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PROJECT_NAME_MAX_LENGTH } from '../project.constants';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROJECT_NAME_MAX_LENGTH)
  name!: string;
}
