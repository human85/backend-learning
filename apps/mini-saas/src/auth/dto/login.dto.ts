import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { USER_EMAIL_MAX_LENGTH } from '../../users/user.constants';
import { PASSWORD_MAX_LENGTH } from '../auth.constants';

export class LoginDto {
  @IsEmail()
  @MaxLength(USER_EMAIL_MAX_LENGTH)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
