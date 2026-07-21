const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

function getErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = payload.message;

    if (typeof message === 'string') {
      return message;
    }

    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === 'string')
    ) {
      return message.join(', ');
    }
  }

  return `Request failed with status ${status}`;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function apiRequest<T>(path: string, init?: RequestInit): Promise<T>;
export function apiRequest(path: string, init?: RequestInit): Promise<void>;
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T | void> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
  });

  if (!res.ok) {
    const data: unknown = await res.json();
    throw new ApiError(res.status, getErrorMessage(data, res.status));
  }

  if (res.status === 204) {
    return undefined;
  }

  const data: unknown = await res.json();
  return data as T;
}
