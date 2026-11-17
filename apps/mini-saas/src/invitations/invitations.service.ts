import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';
import { ProjectMemberEntity } from '../projects/project-member.entity';
import { UserEntity } from '../users/user.entity';
import { InvitationEntity } from './invitation.entity';
import { InvitationResponseDto } from './dto/invitation-response.dto';

@Injectable()
export class InvitationsService {
  constructor(private readonly dataSource: DataSource) {}

  async listReceived(currentUserId: number): Promise<InvitationResponseDto[]> {
    const invitations = await this.dataSource
      .getRepository(InvitationEntity)
      .find({
        where: { inviteeId: currentUserId },
        order: { id: 'DESC' },
      });
    return invitations.map((invitation) => this.toResponse(invitation));
  }

  async createInvitation(
    projectId: number,
    inviteeId: number,
    currentUserId: number,
  ): Promise<InvitationResponseDto> {
    try {
      return await this.dataSource.transaction(
        'READ COMMITTED',
        async (manager) => {
          await manager.query("SET LOCAL lock_timeout = '2s'");
          const project = await manager.findOne(ProjectEntity, {
            where: { id: projectId, ownerId: currentUserId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!project) throw new NotFoundException('Project not found');
          if (inviteeId === currentUserId) {
            throw new ConflictException('Cannot invite the project owner');
          }
          if (
            await manager.existsBy(ProjectMemberEntity, {
              projectId,
              memberId: inviteeId,
            })
          ) {
            throw new ConflictException('User is already a project member');
          }
          if (!(await manager.existsBy(UserEntity, { id: inviteeId }))) {
            throw new NotFoundException('Invitee not found');
          }
          if (
            await manager.existsBy(InvitationEntity, {
              projectId,
              inviteeId,
              status: 'pending',
            })
          ) {
            throw new ConflictException('A pending invitation already exists');
          }
          const invitation = await manager.save(
            InvitationEntity,
            manager.create(InvitationEntity, {
              projectId,
              inviterId: currentUserId,
              inviteeId,
              status: 'pending',
            }),
          );
          return this.toResponse(invitation);
        },
      );
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const failure = error.driverError as {
          code?: string;
          constraint?: string;
        };
        if (
          failure.code === '23505' &&
          failure.constraint === 'UQ_invitations_pending'
        ) {
          throw new ConflictException('A pending invitation already exists');
        }
        if (
          failure.code === '23503' &&
          failure.constraint === 'FK_invitations_invitee'
        ) {
          throw new NotFoundException('Invitee not found');
        }
        if (failure.code === '55P03') {
          throw new ServiceUnavailableException('Project is busy; retry later');
        }
      }
      throw error;
    }
  }

  private toResponse(invitation: InvitationEntity): InvitationResponseDto {
    return {
      id: invitation.id,
      projectId: invitation.projectId,
      inviterId: invitation.inviterId,
      inviteeId: invitation.inviteeId,
      status: invitation.status,
      createdAt: invitation.createdAt,
    };
  }
}
