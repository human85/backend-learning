import { ConflictException, Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { PublicUser } from './public-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(email: string, password: string): Promise<PublicUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);

    if (existingUser) {
      throw this.createEmailConflict();
    }

    const passwordHash = await this.passwordService.hash(password);

    try {
      const user = await this.usersService.create(
        normalizedEmail,
        passwordHash,
      );

      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw this.createEmailConflict();
      }

      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string };

    return driverError.code === '23505';
  }

  private createEmailConflict(): ConflictException {
    return new ConflictException('Email is already registered');
  }
}
