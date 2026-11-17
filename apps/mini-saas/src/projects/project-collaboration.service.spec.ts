import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { ProjectCollaborationService } from './project-collaboration.service';

function setup() {
  const manager = {
    query: jest.fn().mockResolvedValue(undefined),
    findOne: jest
      .fn()
      .mockResolvedValueOnce({ id: 10, ownerId: 1 })
      .mockResolvedValueOnce({ id: 20, projectId: 10, memberId: 2 }),
    findOneBy: jest.fn().mockResolvedValue({ id: 10, ownerId: 1 }),
    existsBy: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    insert: jest.fn().mockResolvedValue(undefined),
  };
  const transaction = jest
    .fn()
    .mockImplementation(
      (_level, work: (value: typeof manager) => Promise<unknown>) =>
        work(manager),
    );
  const service = new ProjectCollaborationService({
    transaction,
  } as unknown as DataSource);
  return { service, manager, transaction };
}

describe('Project collaboration failure boundaries', () => {
  it('stops before changing members if the ownership update affects no row', async () => {
    const { service, manager } = setup();
    manager.update.mockResolvedValue({ affected: 0 });
    await expect(service.transfer(10, 2, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(manager.delete).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('does not add the old owner if target membership deletion fails', async () => {
    const { service, manager } = setup();
    manager.delete.mockResolvedValue({ affected: 0 });
    await expect(service.transfer(10, 2, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('does not delete a membership when the leaving user is now owner', async () => {
    const { service, manager } = setup();
    await expect(service.leave(10, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('returns not found if the member disappears before the actual deletion', async () => {
    const { service, manager } = setup();
    manager.delete.mockResolvedValue({ affected: 0 });
    await expect(service.leave(10, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(['transfer', 'leave'] as const)(
    'maps %s lock timeout safely',
    async (method) => {
      const { service, transaction } = setup();
      transaction.mockRejectedValue(
        new QueryFailedError(
          'test',
          [],
          Object.assign(new Error('private lock details'), { code: '55P03' }),
        ),
      );
      const operation =
        method === 'transfer'
          ? service.transfer(10, 2, 1)
          : service.leave(10, 1);
      await expect(operation).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );
});
