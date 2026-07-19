import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SessionAuthGuard } from './session-auth.guard';

describe('SessionAuthGuard', () => {
  const guard = new SessionAuthGuard();

  function createContext(userId?: number): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ session: { userId } }) as Request,
      }),
    } as ExecutionContext;
  }

  it('should allow an authenticated session', () => {
    expect(guard.canActivate(createContext(1))).toBe(true);
  });

  it('should reject a request without an authenticated session', () => {
    expect(() => guard.canActivate(createContext())).toThrow(
      new UnauthorizedException('Authentication required'),
    );
  });
});
