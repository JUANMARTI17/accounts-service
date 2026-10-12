import { DomainException } from '../exception/DomainException.js';

export class Currency {
  private constructor(readonly code: string) {}

  static of(code: string): Currency {
    if (typeof code !== 'string' || !/^[A-Z]{3}$/.test(code)) {
      throw new DomainException('Currency must be a 3-letter uppercase ISO code');
    }
    return new Currency(code);
  }

  equals(other: Currency): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}
