import { randomUUID } from 'node:crypto';

export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;

  protected constructor(
    readonly eventType: string,
    readonly aggregateId: string,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }
}
