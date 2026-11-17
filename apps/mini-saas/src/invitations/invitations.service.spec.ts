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
