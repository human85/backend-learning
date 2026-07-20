import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import {
  getCurrentUser,
  login,
  logout,
  register,
  type PublicUser,
} from './auth.api';

export const currentUserQueryKey = ['auth', 'current-user'] as const;

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
  return useQuery(currentUserQueryOptions);
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: register });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(currentUserQueryKey, null);
    },
  });
}
