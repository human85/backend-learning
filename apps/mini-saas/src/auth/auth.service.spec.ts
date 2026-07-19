import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  let authService: AuthService;
  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findCredentialsByEmail: jest.fn(),
    create: jest.fn(),
  };
  const passwordService = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: PasswordService, useValue: passwordService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should normalize email, hash the password, and return public fields', async () => {
    const createdAt = new Date('2026-07-19T06:00:00.000Z');
    usersService.findByEmail.mockResolvedValue(null);
    passwordService.hash.mockResolvedValue('password-hash');
    usersService.create.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      passwordHash: 'password-hash',
      createdAt,
    });

    const result = await authService.register(
      '  USER@Example.COM  ',
      'correct horse battery staple',
    );

    expect(usersService.findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(passwordService.hash).toHaveBeenCalledWith(
      'correct horse battery staple',
    );
    expect(usersService.create).toHaveBeenCalledWith(
      'user@example.com',
      'password-hash',
    );
    expect(result).toEqual({ id: 1, email: 'user@example.com', createdAt });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should reject an email that is already registered', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
    });

    await expect(
      authService.register('user@example.com', 'correct horse battery staple'),
    ).rejects.toEqual(new ConflictException('Email is already registered'));
    expect(passwordService.hash).not.toHaveBeenCalled();
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('should map a concurrent database unique violation to conflict', async () => {
    const driverError = Object.assign(new Error('duplicate email'), {
      code: '23505',
    });
    usersService.findByEmail.mockResolvedValue(null);
    passwordService.hash.mockResolvedValue('password-hash');
    usersService.create.mockRejectedValue(
      new QueryFailedError('INSERT INTO users', [], driverError),
    );

    await expect(
      authService.register('user@example.com', 'correct horse battery staple'),
    ).rejects.toEqual(new ConflictException('Email is already registered'));
  });

  it('should rethrow database errors that are not unique violations', async () => {
    const databaseError = new Error('database unavailable');
    usersService.findByEmail.mockResolvedValue(null);
    passwordService.hash.mockResolvedValue('password-hash');
    usersService.create.mockRejectedValue(databaseError);

    await expect(
      authService.register('user@example.com', 'correct horse battery staple'),
    ).rejects.toBe(databaseError);
  });

  it('should verify credentials and return public fields', async () => {
    const createdAt = new Date('2026-07-19T06:00:00.000Z');
    usersService.findCredentialsByEmail.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      passwordHash: 'password-hash',
      createdAt,
    });
    passwordService.verify.mockResolvedValue(true);

    const result = await authService.login(
      '  USER@Example.COM  ',
      'correct horse battery staple',
    );

    expect(usersService.findCredentialsByEmail).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(passwordService.verify).toHaveBeenCalledWith(
      'password-hash',
      'correct horse battery staple',
    );
    expect(result).toEqual({ id: 1, email: 'user@example.com', createdAt });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('should return the same unauthorized error when the email is missing', async () => {
    usersService.findCredentialsByEmail.mockResolvedValue(null);

    await expect(
      authService.login('missing@example.com', 'incorrect password'),
    ).rejects.toEqual(new UnauthorizedException('Invalid email or password'));
    expect(passwordService.verify).not.toHaveBeenCalled();
  });

  it('should return the same unauthorized error when the password is wrong', async () => {
    usersService.findCredentialsByEmail.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      passwordHash: 'password-hash',
    });
    passwordService.verify.mockResolvedValue(false);

    await expect(
      authService.login('user@example.com', 'incorrect password'),
    ).rejects.toEqual(new UnauthorizedException('Invalid email or password'));
  });

  it('should return the current public user for an authenticated session', async () => {
    const createdAt = new Date('2026-07-19T06:00:00.000Z');
    usersService.findById.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      createdAt,
    });

    await expect(authService.getCurrentUser(1)).resolves.toEqual({
      id: 1,
      email: 'user@example.com',
      createdAt,
    });
  });

  it('should reject a session whose user no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(authService.getCurrentUser(999)).rejects.toEqual(
      new UnauthorizedException('Authentication required'),
    );
  });
});
