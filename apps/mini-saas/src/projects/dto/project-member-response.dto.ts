import { ApiProperty } from '@nestjs/swagger';

export class ProjectMemberResponseDto {
  @ApiProperty({ example: 2, description: 'User ID' })
  userId!: number;

  @ApiProperty({ enum: ['owner', 'member'] })
  role!: 'owner' | 'member';
}
