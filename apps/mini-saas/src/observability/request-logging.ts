import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { RequestHandler, Response } from 'express';

type RequestLog = {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: 'http_request_completed';
  requestId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
};

export function writeRequestLog(entry: RequestLog): void {
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

export function createRequestLoggingMiddleware(
  write: (entry: RequestLog) => void = writeRequestLog,
): RequestHandler {
  return (request, response, next) => {
    const requestId = randomUUID();
    const startedAt = performance.now();
    response.setHeader('X-Request-ID', requestId);

    // Closure keeps concurrent requests isolated without a shared mutable ID.
    response.once('finish', () => {
      const statusCode = response.statusCode;
      const route = request.route as { path?: unknown } | undefined;
      write({
        timestamp: new Date().toISOString(),
        level:
          statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
        event: 'http_request_completed',
        requestId,
        method: request.method,
        // Never log raw URLs: query strings and path values can contain secrets.
        route: typeof route?.path === 'string' ? route.path : '<unmatched>',
        statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
    });
    next();
  };
}

@Catch()
export class SafeHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    // Preserve parser 400/413 failures without echoing parser input or errors.
    const parserStatus = (exception as { status?: unknown } | null)?.status;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : parserStatus === 400 || parserStatus === 413
          ? parserStatus
          : 500;
    const body =
      exception instanceof HttpException && status < 500
        ? exception.getResponse()
        : {
            statusCode: status,
            message:
              status >= 500
                ? 'Internal server error'
                : status === 413
                  ? 'Payload too large'
                  : 'Bad request',
          };

    if (response.headersSent) {
      response.end();
      return;
    }
    // Raw exception messages/stacks may contain SQL parameters or credentials.
    response
      .status(status)
      .json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
  }
}
