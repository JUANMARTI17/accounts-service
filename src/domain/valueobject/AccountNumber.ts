import { randomInt } from 'node:crypto';
import { DomainException } from '../exception/DomainException.js';

/** Número de cuenta visible: `ACC-` + 10 dígitos (columna varchar(50)). */
export class AccountNumber {
  private constructor(readonly value: string) {}

  static generate(): AccountNumber {
    return new AccountNumber(`ACC-${String(randomInt(0, 10_000_000_000)).padStart(10, '0')}`);
  }

  static of(value: string): AccountNumber {
    if (typeof value !== 'string' || !/^[A-Za-z0-9-]{1,50}$/.test(value)) {
      throw new DomainException('AccountNumber must be 1-50 alphanumeric characters or dashes');
    }
    return new AccountNumber(value);
  }

  equals(other: AccountNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
