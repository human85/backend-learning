import { useEffect } from 'react';
import {
  queryOptions,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { collaborationQueryKey } from '@/features/projects/projects.queries';
import {
  getCurrentUser,
  login,
  logout,
  register,
  type PublicUser,
} from './auth.api';

export const currentUserQueryKey = ['auth', 'current-user'] as const;

const sessionChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('mini-saas-session')
    : undefined;

async function updateSession(client: QueryClient, user: PublicUser | null) {
  await client.cancelQueries({ queryKey: currentUserQueryKey });
  client.removeQueries({ queryKey: collaborationQueryKey });
  client.setQueryData(currentUserQueryKey, user);
  sessionChannel?.postMessage('changed');
}

export async function loadCurrentUser(): Promise<PublicUser | null> {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export const currentUserQueryOptions = queryOptions({
  queryKey: currentUserQueryKey,
  queryFn: loadCurrentUser,
  retry: false,
  staleTime: 60_000,
});

export function useCurrentUserQuery() {
  const client = useQueryClient();

  useEffect(() => {
    function handleSessionChange() {
      // Cookies are shared by tabs. Check the new identity before borrowing its cache key.
      void client.resetQueries({ queryKey: currentUserQueryKey });
      client.removeQueries({ queryKey: collaborationQueryKey });
    }

    sessionChannel?.addEventListener('message', handleSessionChange);
    return () =>
      sessionChannel?.removeEventListener('message', handleSessionChange);
  }, [client]);

  return useQuery(currentUserQueryOptions);
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: register });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => updateSession(queryClient, user),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => updateSession(queryClient, null),
  });
}
