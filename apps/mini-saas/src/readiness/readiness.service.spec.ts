import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { ReadinessService } from './readiness.service';

jest.mock('pg', () => ({ Pool: jest.fn() }));

describe('ReadinessService resource boundaries', () => {
  const release = jest.fn();
  const query = jest.fn();
  const connect = jest.fn();
  const end = jest.fn();
  let service: ReadinessService;

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockResolvedValue({ rows: [] });
    connect.mockResolvedValue({ query, release });
    end.mockResolvedValue(undefined);
    jest.mocked(Pool).mockImplementation(
      () =>
        ({
          connect,
          end,
          on: jest.fn(),
        }) as unknown as Pool,
    );
    service = new ReadinessService(
      new ConfigService({ DATABASE_URL: 'postgres://test' }),
    );
  });

  it('shares concurrent probes and releases a healthy client for reuse', async () => {
    const first = service.check();
    const second = service.check();
    expect(first).toBe(second);
    expect(await first).toBe(true);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(false);
    await service.check();
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('destroys a failed client and permits the next check to recover', async () => {
    query.mockRejectedValueOnce(new Error('secret'));
    expect(await service.check()).toBe(false);
    expect(release).toHaveBeenCalledWith(true);
    expect(await service.check()).toBe(true);
  });

  it('handles connection acquisition failures without releasing a nonexistent client', async () => {
    connect.mockRejectedValueOnce(new Error('connection timeout'));
    expect(await service.check()).toBe(false);
    expect(release).not.toHaveBeenCalled();
    expect(await service.check()).toBe(true);
    await service.onModuleDestroy();
    expect(end).toHaveBeenCalledTimes(1);
  });
});
