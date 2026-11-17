import { ApiProperty } from '@nestjs/swagger';
import type { InvitationStatus } from '../invitation.entity';

export class InvitationResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  projectId!: number;

  @ApiProperty({ example: 1 })
  inviterId!: number;

  @ApiProperty({ example: 2 })
  inviteeId!: number;

  @ApiProperty({ enum: ['pending', 'accepted', 'rejected'] })
  status!: InvitationStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
