import { describe, expect, it, vi } from 'vitest';
import { AccountCreatedDomainEvent } from '../../../src/domain/event/AccountCreatedDomainEvent.js';
import { AccountModel } from '../../../src/domain/model/AccountModel.js';
import { AccountBalance } from '../../../src/domain/valueobject/AccountBalance.js';
import { Currency } from '../../../src/domain/valueobject/Currency.js';
import { UserId } from '../../../src/domain/valueobject/UserId.js';
import { persisted } from '../../helpers.js';
import { KafkaAccountEventPublisher } from '../../../src/infrastructure/messaging/KafkaAccountEventPublisher.js';

describe('KafkaAccountEventPublisher', () => {
  const account = persisted(
    AccountModel.create(UserId.of('user-1'), AccountBalance.zero(), Currency.of('COP')),
    7,
  );
  const event = AccountCreatedDomainEvent.from(account);

  it('sends the contract JSON keyed by accountId with acks=-1', async () => {
    const send = vi.fn(async () => []);
    await new KafkaAccountEventPublisher({ send }, 'accounts.created').publishAccountCreated(event);

    expect(send).toHaveBeenCalledOnce();
    const arg = send.mock.calls[0]![0] as unknown as {
      topic: string;
      acks: number;
      messages: { key: string; value: string }[];
    };
    expect(arg.topic).toBe('accounts.created');
    expect(arg.acks).toBe(-1);
    const message = arg.messages[0]!;
    expect(message.key).toBe(account.id.toString());

    const json = JSON.parse(message.value);
    expect(json).toEqual({
      eventId: event.eventId,
      eventType: 'ACCOUNT_CREATED',
      occurredAt: event.occurredAt.toISOString(),
      aggregateId: account.id.toString(),
      payload: {
        accountId: account.id.toString(),
        userId: 'user-1',
        balance: 0,
        currency: 'COP',
        status: 'ACTIVE',
      },
    });
  });

  it('serializes balance as a JSON number with two decimals', () => {
    const raw = KafkaAccountEventPublisher.serialize(event);
    expect(raw).toContain('"balance":0.00,');
  });
});
