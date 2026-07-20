import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './api';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves request options and forces session credentials', async () => {
    const response = new Response(JSON.stringify({ id: 1 }), { status: 200 });
    const jsonSpy = vi.spyOn(response, 'json');
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiRequest<{ id: number }>('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'First project' }),
        credentials: 'omit',
      }),
    ).resolves.toEqual({ id: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/projects',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'First project' }),
        credentials: 'include',
      }),
    );
    expect(jsonSpy).toHaveBeenCalledOnce();
  });

  it('does not parse a 204 response body', async () => {
    const response = new Response(null, { status: 204 });
    const jsonSpy = vi.spyOn(response, 'json');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(apiRequest('/projects/1')).resolves.toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it('throws an ApiError with the HTTP status and backend message', async () => {
    const response = new Response(
      JSON.stringify({ message: 'Authentication required' }),
      { status: 401 },
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(apiRequest('/auth/me')).rejects.toEqual(
      new ApiError(401, 'Authentication required'),
    );
  });

  it('normalizes validation messages and falls back for unknown errors', async () => {
    const validationResponse = new Response(
      JSON.stringify({ message: ['Name is required', 'Name is too long'] }),
      { status: 400 },
    );
    const unknownResponse = new Response(JSON.stringify({}), { status: 500 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(validationResponse)
      .mockResolvedValueOnce(unknownResponse);
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/projects')).rejects.toEqual(
      new ApiError(400, 'Name is required, Name is too long'),
    );
    await expect(apiRequest('/projects')).rejects.toEqual(
      new ApiError(500, 'Request failed with status 500'),
    );
  });
});
