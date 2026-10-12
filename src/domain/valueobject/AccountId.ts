import { DomainException } from '../exception/DomainException.js';

const INT4_MAX = 2_147_483_647;

/** Identificador de cuenta: entero (int4) asignado por la base de datos al guardar. */
export class AccountId {
  private constructor(readonly value: number) {}

  static of(value: number | string): AccountId {
    const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > INT4_MAX) {
      throw new DomainException('AccountId must be a positive 32-bit integer');
    }
    return new AccountId(n);
  }

  equals(other: AccountId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}
