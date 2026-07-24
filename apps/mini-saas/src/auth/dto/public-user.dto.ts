import { ApiProperty } from '@nestjs/swagger';
import { USER_EMAIL_MAX_LENGTH } from '../../users/user.constants';

export class PublicUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({
    example: 'user@example.com',
    format: 'email',
    maxLength: USER_EMAIL_MAX_LENGTH,
  })
  email!: string;

  @ApiProperty({
    example: '2026-07-22T00:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;
}
