import { DomainException } from '../exception/DomainException.js';

// NUMERIC(15, 2): hasta 13 dígitos enteros y 2 decimales. Se guarda como string, nunca como float.
const DECIMAL_REGEX = /^\d{1,13}(\.\d{1,2})?$/;

export class AccountBalance {
  private constructor(readonly value: string) {}

  static zero(): AccountBalance {
    return new AccountBalance('0.00');
  }

  static of(value: string): AccountBalance {
    if (typeof value !== 'string' || !DECIMAL_REGEX.test(value.trim())) {
      throw new DomainException(
        'AccountBalance must be a non-negative decimal with at most 2 decimals',
      );
    }
    const [integer = '0', decimals = ''] = value.trim().split('.');
    const normalizedInteger = integer.replace(/^0+(?=\d)/, '');
    return new AccountBalance(`${normalizedInteger}.${decimals.padEnd(2, '0')}`);
  }

  equals(other: AccountBalance): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
