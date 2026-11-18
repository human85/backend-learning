import { apiRequest } from '@/lib/api';

export type Project = {
  id: number;
  name: string;
  ownerId: number;
};

export type ProjectMember = {
  userId: number;
  role: 'owner' | 'member';
};

export type Invitation = {
  id: number;
  projectId: number;
  inviterId: number;
  status: 'pending' | 'accepted' | 'rejected';
};

export function getProjects(signal: AbortSignal) {
  return apiRequest<Project[]>('/projects', { signal });
}

export function getProjectMembers(projectId: number, signal: AbortSignal) {
  return apiRequest<ProjectMember[]>(`/projects/${projectId}/members`, {
    signal,
  });
}

export function getInvitations(signal: AbortSignal) {
  return apiRequest<Invitation[]>('/invitations', { signal });
}

function jsonRequest(method: 'POST' | 'PATCH', body: object): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function createProject(name: string) {
  return apiRequest<Project>('/projects', jsonRequest('POST', { name }));
}

export function renameProject(projectId: number, name: string) {
  return apiRequest<Project>(
    `/projects/${projectId}`,
    jsonRequest('PATCH', { name }),
  );
}

export function deleteProject(projectId: number) {
  return apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
}

export function inviteToProject(projectId: number, inviteeId: number) {
  return apiRequest<Invitation>(
    `/projects/${projectId}/invitations`,
    jsonRequest('POST', { inviteeId }),
  );
}

export function transferProject(projectId: number, memberId: number) {
  return apiRequest(
    `/projects/${projectId}/transfer`,
    jsonRequest('POST', { memberId }),
  );
}

export function leaveProject(projectId: number) {
  return apiRequest(`/projects/${projectId}/members/me`, { method: 'DELETE' });
}

export function respondToInvitation(id: number, response: 'accept' | 'reject') {
  return apiRequest(`/invitations/${id}/${response}`, { method: 'POST' });
}
