import type { Producer } from 'kafkajs';
import type { AccountEventPublisherPort } from '../../application/port/out/AccountEventPublisherPort.js';
import type { AccountCreatedDomainEvent } from '../../domain/event/AccountCreatedDomainEvent.js';

export class KafkaAccountEventPublisher implements AccountEventPublisherPort {
  constructor(
    private readonly producer: Pick<Producer, 'send'>,
    private readonly topic: string,
  ) {}

  /** Serializa el contrato JSON. Público para poder probarlo sin Kafka. */
  static serialize(event: AccountCreatedDomainEvent): string {
    // balance sale como número JSON con dos decimales (p. ej. 0.00). Se inserta el literal
    // decimal tal cual, sin pasar por float, y el resto lo serializa JSON.stringify.
    const body = JSON.stringify({
      eventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      aggregateId: event.aggregateId,
      payload: {
        accountId: event.accountId,
        userId: event.userId,
        balance: '__BALANCE__',
        currency: event.currency,
        status: event.status,
      },
    });
    return body.replace('"__BALANCE__"', event.balance);
  }

  async publishAccountCreated(event: AccountCreatedDomainEvent): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      acks: -1,
      messages: [{ key: event.accountId, value: KafkaAccountEventPublisher.serialize(event) }],
    });
  }
}
