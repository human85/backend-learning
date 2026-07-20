import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../lib/api';
import {
  getCurrentUser,
  login,
  logout,
  register,
  type AuthCredentials,
} from './auth.api';

vi.mock('../../lib/api', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);
const credentials: AuthCredentials = {
  email: 'user@example.com',
  password: 'correct horse battery staple',
};

describe('auth api', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('registers without treating registration as a login', async () => {
    await register(credentials);

    expect(apiRequestMock).toHaveBeenCalledOnce();
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  });

  it('uses the login endpoint to establish a session', async () => {
    await login(credentials);

    expect(apiRequestMock).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  });

  it('loads the current user from the server session', async () => {
    await getCurrentUser();

    expect(apiRequestMock).toHaveBeenCalledWith('/auth/me');
  });

  it('logs out through an empty response endpoint', async () => {
    await logout();

    expect(apiRequestMock).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
    });
  });
});
