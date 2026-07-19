import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthSessionService {
  start(request: Request, userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      request.session.regenerate((regenerateError) => {
        if (regenerateError) {
          reject(
            regenerateError instanceof Error
              ? regenerateError
              : new Error('Failed to regenerate session'),
          );
          return;
        }

        request.session.userId = userId;
        request.session.save((saveError) => {
          if (saveError) {
            reject(
              saveError instanceof Error
                ? saveError
                : new Error('Failed to save session'),
            );
            return;
          }

          resolve();
        });
      });
    });
  }

  end(request: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      request.session.destroy((error) => {
        if (error) {
          reject(
            error instanceof Error
              ? error
              : new Error('Failed to destroy session'),
          );
          return;
        }

        resolve();
      });
    });
  }
}
