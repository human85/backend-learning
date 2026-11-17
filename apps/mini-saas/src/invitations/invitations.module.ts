import { Module } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { InvitationsService } from './invitations.service';
import { ProjectInvitationsController } from './project-invitations.controller';

@Module({
  controllers: [ProjectInvitationsController],
  providers: [InvitationsService, SessionAuthGuard],
})
export class InvitationsModule {}
