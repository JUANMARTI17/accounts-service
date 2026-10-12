import type { AccountStatus } from '../enums/AccountStatus.js';
import type { AccountModel } from '../model/AccountModel.js';
import { DomainEvent } from './DomainEvent.js';

export class AccountCreatedDomainEvent extends DomainEvent {
  private constructor(
    readonly accountId: string,
    readonly userId: string,
    readonly balance: string,
    readonly currency: string,
    readonly status: AccountStatus,
  ) {
    super('ACCOUNT_CREATED', accountId);
  }

  /** La cuenta debe estar guardada (con id asignado). */
  static from(account: AccountModel): AccountCreatedDomainEvent {
    return new AccountCreatedDomainEvent(
      account.id.toString(),
      account.userId.value,
      account.balance.value,
      account.currency.code,
      account.status,
    );
  }
}
