import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReadinessService } from './readiness.service';

@Controller('ready')
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get()
  @ApiOperation({
    summary: 'Check database connectivity (not business correctness)',
  })
  @ApiResponse({ status: 200, description: 'Database probe succeeded' })
  @ApiResponse({
    status: 503,
    description: 'Database probe failed or timed out',
  })
  async getReady(@Res({ passthrough: true }) response: Response) {
    const ready = await this.readiness.check();
    response.setHeader('Cache-Control', 'no-store');
    response.status(ready ? 200 : 503);
    if (!ready) response.locals.readinessFailure = 'database_probe_failed';
    return { status: ready ? 'ok' : 'not_ready' };
  }
}
