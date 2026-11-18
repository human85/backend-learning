import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PublicUser } from '@/features/auth/auth.api';
import type { Project } from './projects.api';
import {
  useCreateProject,
  useInvitationResponse,
  useInvitations,
  useProjectAction,
  useProjectMembers,
  useProjects,
} from './projects.queries';

function RequestError({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{error.message}</AlertDescription>
      {retry && (
        <Button type="button" variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </Alert>
  );
}

export function ProjectsWorkspace({ user }: { user: PublicUser }) {
  const projects = useProjects(user.id);
  const create = useCreateProject(user.id);
  const [selectedId, setSelectedId] = useState<number>();
  const selected =
    projects.data?.find((project) => project.id === selectedId) ??
    projects.data?.[0];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div className="grid min-w-0 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const name = String(new FormData(form).get('name')).trim();
                if (!name || create.isPending) return;
                create.mutate(name, {
                  onSuccess: (project) => {
                    setSelectedId(project.id);
                    form.reset();
                  },
                });
              }}
            >
              <Label htmlFor="new-project">New project name</Label>
              <div className="flex gap-2">
                <Input id="new-project" name="name" maxLength={100} required />
                <Button type="submit" disabled={create.isPending}>
                  Create project
                </Button>
              </div>
            </form>
            {create.error && <RequestError error={create.error} />}
            {projects.isPending ? (
              <p role="status">Loading projects…</p>
            ) : projects.isError ? (
              <RequestError
                error={projects.error}
                retry={() => void projects.refetch()}
              />
            ) : projects.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <ul className="grid gap-1" aria-label="Your projects">
                {projects.data.map((project) => (
                  <li key={project.id} className="min-w-0">
                    <Button
                      type="button"
                      variant={
                        selected?.id === project.id ? 'secondary' : 'ghost'
                      }
                      className="w-full justify-between gap-3"
                      aria-pressed={selected?.id === project.id}
                      onClick={() => setSelectedId(project.id)}
                    >
                      <span className="truncate">{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {project.ownerId === user.id ? 'Owner' : 'Member'}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <InvitationInbox
          userId={user.id}
          projects={projects.isSuccess ? projects.data : []}
        />
      </div>
      {projects.isSuccess && selected && (
        <ProjectPanel key={selected.id} project={selected} userId={user.id} />
      )}
    </div>
  );
}

function InvitationInbox({
  userId,
  projects,
}: {
  userId: number;
  projects: Project[];
}) {
  const invitations = useInvitations(userId);
  const reply = useInvitationResponse(userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Received invitations</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {reply.error && <RequestError error={reply.error} />}
        {invitations.isPending ? (
          <p role="status">Loading invitations…</p>
        ) : invitations.isError ? (
          <RequestError
            error={invitations.error}
            retry={() => void invitations.refetch()}
          />
        ) : invitations.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invitations yet.</p>
        ) : (
          <ul className="grid divide-y">
            {invitations.data.map((invitation) => (
              <li
                key={invitation.id}
                className="grid gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">
                      {projects.find(({ id }) => id === invitation.projectId)
                        ?.name ?? `Project #${invitation.projectId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      From user #{invitation.inviterId}
                    </p>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">
                    {invitation.status}
                  </span>
                </div>
                {invitation.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={reply.isPending}
                      onClick={() =>
                        reply.mutate({ ...invitation, response: 'accept' })
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={reply.isPending}
                      onClick={() =>
                        reply.mutate({ ...invitation, response: 'reject' })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectPanel({
  project,
  userId,
}: {
  project: Project;
  userId: number;
}) {
  const roster = useProjectMembers(userId, project.id);
  const action = useProjectAction(userId, project.id);
  const isOwner = project.ownerId === userId;
  const rosterOwner = roster.data?.find((member) => member.role === 'owner');
  const rolesAgree = rosterOwner?.userId === project.ownerId;
  const members =
    roster.data?.filter((member) => member.role === 'member') ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="break-words text-xl">{project.name}</CardTitle>
        <CardDescription>
          Project #{project.id} · {isOwner ? 'Owner' : 'Member'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {action.error && <RequestError error={action.error} />}
        {action.isSuccess && action.variables.type === 'invite' && (
          <p role="status" className="text-sm">
            Invitation sent.
          </p>
        )}
        <section aria-labelledby="roster-heading" className="grid gap-2">
          <h2 id="roster-heading" className="font-medium">
            Members
          </h2>
          {roster.isPending ? (
            <p role="status">Loading members…</p>
          ) : roster.isError ? (
            <RequestError
              error={roster.error}
              retry={() => void roster.refetch()}
            />
          ) : (
            <ul
              className="divide-y rounded-lg border px-3"
              aria-label="Project members"
            >
              {roster.data.map((member) => (
                <li
                  key={member.userId}
                  className="flex justify-between gap-3 py-2 text-sm"
                >
                  <span>
                    User #{member.userId}
                    {member.userId === userId ? ' (you)' : ''}
                  </span>
                  <span className="capitalize text-muted-foreground">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {roster.isSuccess &&
          rolesAgree &&
          (isOwner ? (
            <section
              aria-labelledby="management-heading"
              className="grid gap-4 border-t pt-4"
            >
              <h2 id="management-heading" className="font-medium">
                Manage project
              </h2>
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = String(
                    new FormData(event.currentTarget).get('name'),
                  ).trim();
                  if (name && !action.isPending)
                    action.mutate({ type: 'rename', name });
                }}
              >
                <Label htmlFor="project-name">Project name</Label>
                <div className="flex gap-2">
                  <Input
                    key={project.name}
                    id="project-name"
                    name="name"
                    defaultValue={project.name}
                    maxLength={100}
                    required
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={action.isPending}
                  >
                    Save name
                  </Button>
                </div>
              </form>
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const inviteeId = Number(new FormData(form).get('inviteeId'));
                  if (
                    !Number.isSafeInteger(inviteeId) ||
                    inviteeId < 1 ||
                    action.isPending
                  )
                    return;
                  action.mutate(
                    { type: 'invite', inviteeId },
                    { onSuccess: () => form.reset() },
                  );
                }}
              >
                <Label htmlFor="invitee-id">
                  Invite a registered user by ID
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="invitee-id"
                    name="inviteeId"
                    type="number"
                    min={1}
                    max={2147483647}
                    required
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={action.isPending}
                  >
                    Send invite
                  </Button>
                </div>
              </form>
              {members.length > 0 && (
                <form
                  className="grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const memberId = Number(
                      new FormData(event.currentTarget).get('memberId'),
                    );
                    if (
                      !members.some(({ userId }) => userId === memberId) ||
                      action.isPending
                    )
                      return;
                    if (
                      window.confirm(
                        `Transfer ownership to user #${memberId}? You will become a member.`,
                      )
                    ) {
                      action.mutate({ type: 'transfer', memberId });
                    }
                  }}
                >
                  <Label htmlFor="new-owner">New owner</Label>
                  <div className="flex flex-wrap gap-2">
                    <select
                      id="new-owner"
                      name="memberId"
                      className="h-8 min-w-32 flex-1 rounded-lg border bg-background px-2 text-sm"
                      defaultValue=""
                      required
                    >
                      <option value="" disabled>
                        Choose a member
                      </option>
                      {members.map(({ userId }) => (
                        <option key={userId} value={userId}>
                          User #{userId}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={action.isPending}
                    >
                      Transfer ownership
                    </Button>
                  </div>
                </form>
              )}
              <Button
                type="button"
                className="justify-self-start"
                variant="destructive"
                disabled={action.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete ${project.name} and its invitations?`,
                    )
                  )
                    action.mutate({ type: 'delete' });
                }}
              >
                Delete project
              </Button>
            </section>
          ) : (
            <Button
              type="button"
              className="justify-self-start"
              variant="outline"
              disabled={action.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Leave ${project.name}? You will need a new invitation to rejoin.`,
                  )
                )
                  action.mutate({ type: 'leave' });
              }}
            >
              Leave project
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
