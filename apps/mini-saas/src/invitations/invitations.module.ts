import { Module } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { ProjectInvitationsController } from './project-invitations.controller';

@Module({
  controllers: [ProjectInvitationsController, InvitationsController],
  providers: [InvitationsService, SessionAuthGuard],
})
export class InvitationsModule {}
