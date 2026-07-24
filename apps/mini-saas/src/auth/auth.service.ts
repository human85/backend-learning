import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { PublicUserDto } from './dto/public-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(email: string, password: string): Promise<PublicUserDto> {
    const normalizedEmail = this.normalizeEmail(email);
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

      return this.toPublicUser(user);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw this.createEmailConflict();
      }

      throw error;
    }
  }

  async login(email: string, password: string): Promise<PublicUserDto> {
    const normalizedEmail = this.normalizeEmail(email);
    const user =
      await this.usersService.findCredentialsByEmail(normalizedEmail);

    if (!user) {
      throw this.createInvalidCredentials();
    }

    const passwordMatches = await this.passwordService.verify(
      user.passwordHash,
      password,
    );

    if (!passwordMatches) {
      throw this.createInvalidCredentials();
    }

    return this.toPublicUser(user);
  }

  async getCurrentUser(userId: number): Promise<PublicUserDto> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.toPublicUser(user);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toPublicUser(user: UserEntity): PublicUserDto {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
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

  private createInvalidCredentials(): UnauthorizedException {
    return new UnauthorizedException('Invalid email or password');
  }
}
