import { Request } from 'express';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  const authSessionService = new AuthSessionService();

  it('should regenerate and save a session for the authenticated user', async () => {
    const save = jest.fn((callback: (error?: Error) => void) => callback());
    const regeneratedSession = { save };
    const request = { session: {} } as unknown as Request;
    const regenerate = jest.fn((callback: (error?: Error) => void) => {
      request.session = regeneratedSession as Request['session'];
      callback();
    });
    request.session = { regenerate } as unknown as Request['session'];

    await authSessionService.start(request, 42);

    expect(regenerate).toHaveBeenCalled();
    expect(request.session.userId).toBe(42);
    expect(save).toHaveBeenCalled();
  });

  it('should destroy the current session', async () => {
    const destroy = jest.fn((callback: (error?: Error) => void) => callback());
    const session = {
      destroy,
    } as unknown as Request['session'];
    const request = { session } as Request;

    await authSessionService.end(request);

    expect(destroy).toHaveBeenCalled();
  });
});
