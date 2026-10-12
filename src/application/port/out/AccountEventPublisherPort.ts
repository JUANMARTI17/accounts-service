import type { AccountCreatedDomainEvent } from '../../../domain/event/AccountCreatedDomainEvent.js';

export interface AccountEventPublisherPort {
  publishAccountCreated(event: AccountCreatedDomainEvent): Promise<void>;
}
