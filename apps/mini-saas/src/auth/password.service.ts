import { Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';
import { ARGON2_OPTIONS } from './auth.constants';

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
