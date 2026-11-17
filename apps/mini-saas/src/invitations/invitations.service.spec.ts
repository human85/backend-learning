import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { InvitationsService } from './invitations.service';

describe('InvitationsService database failure boundaries', () => {
  const transaction = jest.fn();
  const service = new InvitationsService({
    transaction,
  } as unknown as DataSource);

  beforeEach(() => transaction.mockReset());

  it.each([
    ['23505', 'UQ_invitations_pending', ConflictException],
    ['23503', 'FK_invitations_invitee', NotFoundException],
    ['55P03', undefined, ServiceUnavailableException],
  ])(
    'maps %s / %s to a safe HTTP error',
    async (code, constraint, expected) => {
      transaction.mockRejectedValue(
        new QueryFailedError(
          'test',
          [],
          Object.assign(new Error('private database details'), {
            code,
            constraint,
          }),
        ),
      );
      await expect(service.createInvitation(1, 2, 1)).rejects.toBeInstanceOf(
        expected,
      );
      await expect(
        service.createInvitation(1, 2, 1),
      ).rejects.not.toHaveProperty('message', 'private database details');
    },
  );

  it.each([
    ['23505', 'unrelated_unique_constraint'],
    ['23503', 'FK_invitations_project'],
    ['XX000', undefined],
  ])(
    'does not mislabel unrelated %s / %s as a business conflict',
    async (code, constraint) => {
      const error = new QueryFailedError(
        'test',
        [],
        Object.assign(new Error('test'), { code, constraint }),
      );
      transaction.mockRejectedValue(error);
      await expect(service.createInvitation(1, 2, 1)).rejects.toBe(error);
    },
  );
});

describe.each(['acceptInvitation', 'rejectInvitation'] as const)(
  'InvitationsService %s affected-row guard',
  (method) => {
    it.each([0, undefined])(
      'does not insert a member when affected is %s',
      async (affected) => {
        const invitation = {
          id: 1,
          projectId: 10,
          inviteeId: 2,
          status: 'pending',
        };
        const manager = {
          query: jest.fn().mockResolvedValue(undefined),
          findOneBy: jest.fn().mockResolvedValue(invitation),
          findOne: jest
            .fn()
            .mockResolvedValueOnce({ id: 10, ownerId: 1 })
            .mockResolvedValueOnce(invitation),
          existsBy: jest.fn().mockResolvedValue(false),
          update: jest.fn().mockResolvedValue({ affected }),
          insert: jest.fn(),
        };
        const service = new InvitationsService({
          transaction: jest
            .fn()
            .mockImplementation(
              (_level, work: (value: typeof manager) => Promise<unknown>) =>
                work(manager),
            ),
        } as unknown as DataSource);
        await expect(service[method](1, 2)).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(manager.insert).not.toHaveBeenCalled();
      },
    );
  },
);

describe('InvitationsService rejection database failures', () => {
  it('maps lock timeout to service unavailable', async () => {
    const failure = new QueryFailedError(
      'test',
      [],
      Object.assign(new Error('private lock details'), { code: '55P03' }),
    );
    const service = new InvitationsService({
      transaction: jest.fn().mockRejectedValue(failure),
    } as unknown as DataSource);
    await expect(service.rejectInvitation(1, 2)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not mislabel an unknown write failure as a state conflict', async () => {
    const failure = new QueryFailedError('test', [], new Error('write failed'));
    const service = new InvitationsService({
      transaction: jest.fn().mockRejectedValue(failure),
    } as unknown as DataSource);
    await expect(service.rejectInvitation(1, 2)).rejects.toBe(failure);
  });
});
