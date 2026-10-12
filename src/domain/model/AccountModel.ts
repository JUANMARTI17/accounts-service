import { AccountStatus } from '../enums/AccountStatus.js';
import { DomainException } from '../exception/DomainException.js';
import { AccountBalance } from '../valueobject/AccountBalance.js';
import { AccountId } from '../valueobject/AccountId.js';
import { AccountNumber } from '../valueobject/AccountNumber.js';
import { Currency } from '../valueobject/Currency.js';
import { UserId } from '../valueobject/UserId.js';

export interface AccountProps {
  /** null mientras la cuenta no se ha guardado: el id lo asigna la base de datos. */
  readonly id: AccountId | null;
  readonly userId: UserId;
  readonly accountNumber: AccountNumber;
  readonly balance: AccountBalance;
  readonly currency: Currency;
  readonly status: AccountStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class AccountModel {
  private constructor(private readonly props: AccountProps) {
    Object.freeze(this);
  }

  /** Crea una cuenta nueva: sin id (lo asigna la base), número generado y estado ACTIVE. */
  static create(userId: UserId, balance: AccountBalance, currency: Currency): AccountModel {
    const now = new Date();
    return new AccountModel({
      id: null,
      userId,
      accountNumber: AccountNumber.generate(),
      balance,
      currency,
      status: AccountStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruye una cuenta ya persistida. */
  static restore(props: AccountProps): AccountModel {
    return new AccountModel({ ...props });
  }

  get id(): AccountId {
    if (this.props.id === null) {
      throw new DomainException('Account has not been persisted yet and has no id');
    }
    return this.props.id;
  }
  get userId(): UserId {
    return this.props.userId;
  }
  get accountNumber(): AccountNumber {
    return this.props.accountNumber;
  }
  get balance(): AccountBalance {
    return this.props.balance;
  }
  get currency(): Currency {
    return this.props.currency;
  }
  get status(): AccountStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
