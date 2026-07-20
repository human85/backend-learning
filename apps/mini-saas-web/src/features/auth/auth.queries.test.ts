import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { getCurrentUser } from './auth.api';
import { loadCurrentUser } from './auth.queries';

vi.mock('./auth.api', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);

describe('current user query', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
  });

  it('turns an unauthenticated response into signed-out data', async () => {
    getCurrentUserMock.mockRejectedValue(
      new ApiError(401, 'Authentication required'),
    );

    await expect(loadCurrentUser()).resolves.toBeNull();
  });

  it('keeps unexpected API failures as query errors', async () => {
    const error = new ApiError(500, 'Database unavailable');
    getCurrentUserMock.mockRejectedValue(error);

    await expect(loadCurrentUser()).rejects.toBe(error);
  });
});
