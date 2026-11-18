import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import type { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import { ProjectEntity } from './project.entity';
import { ProjectMemberEntity } from './project-member.entity';

@Injectable()
export class ProjectCollaborationService {
  constructor(private readonly dataSource: DataSource) {}

  async listMembers(
    projectId: number,
    currentUserId: number,
  ): Promise<ProjectMemberResponseDto[]> {
    const rows = await this.dataSource.query<
      Array<{ ownerId: number; memberId: number | null }>
    >(
      `SELECT project.owner_id AS "ownerId", membership.member_id AS "memberId"
       FROM projects AS project
       LEFT JOIN project_members AS membership ON membership.project_id = project.id
       WHERE project.id = $1
         AND (project.owner_id = $2 OR EXISTS (
           SELECT 1 FROM project_members AS viewer
           WHERE viewer.project_id = project.id AND viewer.member_id = $2
         ))
       ORDER BY membership.member_id`,
      [projectId, currentUserId],
    );

    const firstRow = rows[0];
    if (!firstRow) throw new NotFoundException('Project not found');

    const members: ProjectMemberResponseDto[] = [
      { userId: firstRow.ownerId, role: 'owner' },
    ];
    for (const { memberId } of rows) {
      if (memberId !== null) members.push({ userId: memberId, role: 'member' });
    }
    return members;
  }

  async transfer(
    projectId: number,
    memberId: number,
    currentUserId: number,
  ): Promise<void> {
    try {
      await this.dataSource.transaction('READ COMMITTED', async (manager) => {
        await manager.query("SET LOCAL lock_timeout = '2s'");
        const project = await manager.findOne(ProjectEntity, {
          where: { id: projectId, ownerId: currentUserId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!project) throw new NotFoundException('Project not found');
        if (memberId === currentUserId) {
          throw new ConflictException(
            'Cannot transfer a project to its current owner',
          );
        }
        const member = await manager.findOne(ProjectMemberEntity, {
          where: { projectId, memberId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!member)
          throw new ConflictException(
            'Target must be a current project member',
          );

        const ownership = await manager.update(
          ProjectEntity,
          { id: projectId, ownerId: currentUserId },
          { ownerId: memberId },
        );
        if (ownership.affected !== 1)
          throw new NotFoundException('Project not found');
        const removed = await manager.delete(ProjectMemberEntity, {
          id: member.id,
          projectId,
          memberId,
        });
        if (removed.affected !== 1) {
          throw new ConflictException('Target is no longer a project member');
        }
        await manager.insert(ProjectMemberEntity, {
          projectId,
          memberId: currentUserId,
        });
        // Pending invitations belong to the project. Keep their historical inviter.
      });
    } catch (error) {
      this.rethrowDatabaseFailure(error);
    }
  }

  async leave(projectId: number, currentUserId: number): Promise<void> {
    try {
      await this.dataSource.transaction('READ COMMITTED', async (manager) => {
        await manager.query("SET LOCAL lock_timeout = '2s'");
        // Do not let an unrelated user acquire a project lock. This initial
        // check only locates an accessible project; recheck after locking.
        const reference = await manager.findOneBy(ProjectEntity, {
          id: projectId,
        });
        if (
          !reference ||
          (reference.ownerId !== currentUserId &&
            !(await manager.existsBy(ProjectMemberEntity, {
              projectId,
              memberId: currentUserId,
            })))
        )
          throw new NotFoundException('Project not found');
        const project = await manager.findOne(ProjectEntity, {
          where: { id: projectId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!project) throw new NotFoundException('Project not found');
        if (project.ownerId === currentUserId) {
          throw new ConflictException(
            'Transfer project ownership before leaving',
          );
        }
        const removed = await manager.delete(ProjectMemberEntity, {
          projectId,
          memberId: currentUserId,
        });
        if (removed.affected !== 1)
          throw new NotFoundException('Project not found');
      });
    } catch (error) {
      this.rethrowDatabaseFailure(error);
    }
  }

  private rethrowDatabaseFailure(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '55P03'
    ) {
      throw new ServiceUnavailableException('Project is busy; retry later');
    }
    throw error;
  }
}
