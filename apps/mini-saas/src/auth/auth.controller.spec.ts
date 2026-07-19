import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { AppSession } from '../session/session.types';
import { AuthController } from './auth.controller';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';

describe('AuthController', () => {
  let authController: AuthController;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    getCurrentUser: jest.fn(),
  };
  const authSessionService = {
    start: jest.fn(),
    end: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthSessionService, useValue: authSessionService },
        SessionAuthGuard,
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  it('should delegate registration to the auth service', async () => {
    const createdAt = new Date('2026-07-19T06:00:00.000Z');
    authService.register.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      createdAt,
    });

    await expect(
      authController.register({
        email: 'user@example.com',
        password: 'correct horse battery staple',
      }),
    ).resolves.toEqual({ id: 1, email: 'user@example.com', createdAt });
    expect(authService.register).toHaveBeenCalledWith(
      'user@example.com',
      'correct horse battery staple',
    );
  });

  it('should delegate login to the auth service', async () => {
    const createdAt = new Date('2026-07-19T06:00:00.000Z');
    const request = { session: {} } as Request;
    authService.login.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      createdAt,
    });

    await expect(
      authController.login(
        {
          email: 'user@example.com',
          password: 'correct horse battery staple',
        },
        request,
      ),
    ).resolves.toEqual({ id: 1, email: 'user@example.com', createdAt });
    expect(authService.login).toHaveBeenCalledWith(
      'user@example.com',
      'correct horse battery staple',
    );
    expect(authSessionService.start).toHaveBeenCalledWith(request, 1);
  });

  it('should return the current user from the authenticated session', async () => {
    const session = { userId: 1 } as AppSession;
    const publicUser = { id: 1, email: 'user@example.com' };
    authService.getCurrentUser.mockResolvedValue(publicUser);

    await expect(authController.me(session)).resolves.toEqual(publicUser);
    expect(authService.getCurrentUser).toHaveBeenCalledWith(1);
  });

  it('should destroy the session and clear its cookie on logout', async () => {
    const request = { session: { userId: 1 } } as Request;
    const clearCookie = jest.fn();
    const response = { clearCookie } as unknown as Response;

    await authController.logout(request, response);

    expect(authSessionService.end).toHaveBeenCalledWith(request);
    expect(clearCookie).toHaveBeenCalledWith('mini_saas_session', {
      path: '/',
    });
  });
});
