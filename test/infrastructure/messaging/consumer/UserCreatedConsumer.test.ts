import { describe, expect, it, vi } from 'vitest';
import { AccountAlreadyExistsException } from '../../../../src/domain/exception/AccountAlreadyExistsException.js';
import { AccountModel } from '../../../../src/domain/model/AccountModel.js';
import { AccountBalance } from '../../../../src/domain/valueobject/AccountBalance.js';
import { Currency } from '../../../../src/domain/valueobject/Currency.js';
import { UserId } from '../../../../src/domain/valueobject/UserId.js';
import { persisted } from '../../../helpers.js';
import { UserCreatedConsumer } from '../../../../src/infrastructure/messaging/consumer/UserCreatedConsumer.js';

const msg = (value: string) => ({
  topic: 'users.created',
  partition: 0,
  offset: '7',
  value: Buffer.from(value),
});

const validEvent = (eventType = 'USER_CREATED') =>
  JSON.stringify({
    eventId: 'e1',
    eventType,
    occurredAt: '2026-10-10T17:49:07.414085600',
    aggregateId: 'user-1',
    payload: { id: 'user-1', name: 'Secret Name', email: 'secret@example.com' },
    unknownField: true,
  });

function setup() {
  const execute = vi.fn();
  const logger = { debug: vi.fn(), info: vi.fn(), error: vi.fn() };
  return { execute, logger, consumer: new UserCreatedConsumer({ execute }, logger) };
}

describe('UserCreatedConsumer', () => {
  it('creates an account for a valid USER_CREATED event', async () => {
    const { execute, logger, consumer } = setup();
    execute.mockResolvedValue(
      persisted(
        AccountModel.create(UserId.of('user-1'), AccountBalance.zero(), Currency.of('COP')),
      ),
    );

    await consumer.handle(msg(validEvent()));

    expect(execute).toHaveBeenCalledWith({
      userId: 'user-1',
      initialBalance: '0.00',
      currency: 'COP',
    });
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('secret');
  });

  it('logs and continues on invalid JSON without leaking content', async () => {
    const { execute, logger, consumer } = setup();

    await consumer.handle(msg('{not json secret@example.com'));

    expect(execute).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledOnce();
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('secret');
  });

  it('logs and continues when the schema is invalid', async () => {
    const { execute, logger, consumer } = setup();
    await consumer.handle(msg(JSON.stringify({ eventType: 'USER_CREATED' })));
    expect(execute).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('ignores other event types', async () => {
    const { execute, consumer } = setup();
    await consumer.handle(msg(validEvent('USER_UPDATED')));
    expect(execute).not.toHaveBeenCalled();
  });

  it('treats a duplicate as idempotent (debug, no error)', async () => {
    const { execute, logger, consumer } = setup();
    execute.mockRejectedValue(
      AccountAlreadyExistsException.becauseUserIdAlreadyHasAccount('user-1'),
    );

    await consumer.handle(msg(validEvent()));

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalled();
  });

  it('logs and does not rethrow other errors', async () => {
    const { execute, logger, consumer } = setup();
    execute.mockRejectedValue(new Error('boom'));

    await expect(consumer.handle(msg(validEvent()))).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
