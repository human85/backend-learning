import { apiRequest } from '../../lib/api';

export type PublicUser = {
  id: number;
  email: string;
  createdAt: string;
};

export type AuthCredentials = {
  email: string;
  password: string;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

export function register(credentials: AuthCredentials): Promise<PublicUser> {
  return apiRequest<PublicUser>('/auth/register', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
}

export function login(credentials: AuthCredentials): Promise<PublicUser> {
  return apiRequest<PublicUser>('/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
}

export function getCurrentUser(): Promise<PublicUser> {
  return apiRequest<PublicUser>('/auth/me');
}

export function logout(): Promise<void> {
  return apiRequest('/auth/logout', { method: 'POST' });
}
