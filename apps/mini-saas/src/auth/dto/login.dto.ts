import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { USER_EMAIL_MAX_LENGTH } from '../../users/user.constants';
import { PASSWORD_MAX_LENGTH } from '../auth.constants';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    format: 'email',
    maxLength: USER_EMAIL_MAX_LENGTH,
  })
  @IsEmail()
  @MaxLength(USER_EMAIL_MAX_LENGTH)
  email!: string;

  @ApiProperty({
    example: 'correct horse battery staple',
    minLength: 1,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
