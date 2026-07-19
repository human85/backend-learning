import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
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
    authService.login.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      createdAt,
    });

    await expect(
      authController.login({
        email: 'user@example.com',
        password: 'correct horse battery staple',
      }),
    ).resolves.toEqual({ id: 1, email: 'user@example.com', createdAt });
    expect(authService.login).toHaveBeenCalledWith(
      'user@example.com',
      'correct horse battery staple',
    );
  });
});
