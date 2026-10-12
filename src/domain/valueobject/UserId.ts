import { DomainException } from '../exception/DomainException.js';

export class UserId {
  private constructor(readonly value: string) {}

  static of(value: string): UserId {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new DomainException('UserId must not be empty');
    }
    return new UserId(value.trim());
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
