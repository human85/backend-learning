import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import {
  createProject,
  deleteProject,
  getInvitations,
  getProjectMembers,
  getProjects,
  inviteToProject,
  leaveProject,
  renameProject,
  respondToInvitation,
  transferProject,
} from './projects.api';

export const collaborationQueryKey = ['collaboration'] as const;

const projectsKey = (userId: number) =>
  [...collaborationQueryKey, userId, 'projects'] as const;
const membersKey = (userId: number, projectId: number) =>
  [...collaborationQueryKey, userId, 'members', projectId] as const;
const invitationsKey = (userId: number) =>
  [...collaborationQueryKey, userId, 'invitations'] as const;

export function useProjects(userId: number) {
  return useQuery({
    queryKey: projectsKey(userId),
    queryFn: ({ signal }) => getProjects(signal),
    retry: false,
  });
}

export function useProjectMembers(userId: number, projectId: number) {
  return useQuery({
    queryKey: membersKey(userId, projectId),
    queryFn: ({ signal }) => getProjectMembers(projectId, signal),
    retry: false,
  });
}

export function useInvitations(userId: number) {
  return useQuery({
    queryKey: invitationsKey(userId),
    queryFn: ({ signal }) => getInvitations(signal),
    retry: false,
  });
}

export function useCreateProject(userId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: projectsKey(userId) }),
  });
}

type ProjectAction =
  | { type: 'rename'; name: string }
  | { type: 'invite'; inviteeId: number }
  | { type: 'transfer'; memberId: number }
  | { type: 'leave' | 'delete' };

export function useProjectAction(userId: number, projectId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (action: ProjectAction) => {
      switch (action.type) {
        case 'rename':
          await renameProject(projectId, action.name);
          break;
        case 'invite':
          await inviteToProject(projectId, action.inviteeId);
          break;
        case 'transfer':
          await transferProject(projectId, action.memberId);
          break;
        case 'leave':
          await leaveProject(projectId);
          break;
        case 'delete':
          await deleteProject(projectId);
          break;
      }
    },
    onSettled: async (_data, error, action) => {
      const projectList = { queryKey: projectsKey(userId) };
      const roster = { queryKey: membersKey(userId, projectId) };
      const invitations = { queryKey: invitationsKey(userId) };
      if (!error && (action.type === 'leave' || action.type === 'delete')) {
        // Remove this project from the current view before refreshing the list.
        await client.cancelQueries(projectList);
        client.setQueryData(
          projectList.queryKey,
          (projects: Awaited<ReturnType<typeof getProjects>> | undefined) =>
            projects?.filter((project) => project.id !== projectId),
        );
        await client.invalidateQueries({ ...roster, refetchType: 'none' });
        await Promise.all([
          client.invalidateQueries(projectList),
          ...(action.type === 'delete'
            ? [client.invalidateQueries(invitations)]
            : []),
        ]);
      } else if (!error && action.type === 'rename') {
        await client.invalidateQueries(projectList);
      } else if (
        (!error && action.type === 'transfer') ||
        (error instanceof ApiError && [404, 409].includes(error.status))
      ) {
        await Promise.all([
          client.invalidateQueries(projectList),
          client.invalidateQueries(roster),
        ]);
      }
    },
  });
}

export function useInvitationResponse(userId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      response,
    }: {
      id: number;
      projectId: number;
      response: 'accept' | 'reject';
    }) => respondToInvitation(id, response),
    onSettled: async (_data, error, { projectId, response }) => {
      const conflict =
        error instanceof ApiError && [404, 409].includes(error.status);
      if (error && !conflict) return;
      const invitations = client.invalidateQueries({
        queryKey: invitationsKey(userId),
      });
      if (response === 'accept' || conflict) {
        await Promise.all([
          invitations,
          client.invalidateQueries({ queryKey: projectsKey(userId) }),
          client.invalidateQueries({ queryKey: membersKey(userId, projectId) }),
        ]);
      } else {
        await invitations;
      }
    },
  });
}
