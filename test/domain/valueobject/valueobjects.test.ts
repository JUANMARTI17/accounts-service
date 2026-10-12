import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../src/domain/exception/DomainException.js';
import { AccountBalance } from '../../../src/domain/valueobject/AccountBalance.js';
import { AccountNumber } from '../../../src/domain/valueobject/AccountNumber.js';
import { AccountId } from '../../../src/domain/valueobject/AccountId.js';
import { Currency } from '../../../src/domain/valueobject/Currency.js';
import { UserId } from '../../../src/domain/valueobject/UserId.js';

describe('AccountId', () => {
  it('accepts a positive integer or numeric string', () => {
    expect(AccountId.of(5).value).toBe(5);
    expect(AccountId.of('42').value).toBe(42);
  });
  it.each([0, -1, 1.5, 2147483648, 'abc', ''])('rejects %j', (v) => {
    expect(() => AccountId.of(v)).toThrow(DomainException);
  });
});

describe('AccountNumber', () => {
  it('generates ACC- plus 10 digits', () => {
    expect(AccountNumber.generate().value).toMatch(/^ACC-\d{10}$/);
  });
  it('rejects invalid values', () => {
    expect(() => AccountNumber.of('')).toThrow(DomainException);
    expect(() => AccountNumber.of('has space')).toThrow(DomainException);
  });
});

describe('UserId', () => {
  it('accepts a non-empty value', () => {
    expect(UserId.of('abc').value).toBe('abc');
  });
  it.each(['', '   '])('rejects blank value %j', (v) => {
    expect(() => UserId.of(v)).toThrow(DomainException);
  });
});

describe('AccountBalance', () => {
  it.each([
    ['0', '0.00'],
    ['0.00', '0.00'],
    ['10.5', '10.50'],
    ['1234.56', '1234.56'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(AccountBalance.of(input).value).toBe(expected);
  });
  it.each(['-1', '1.234', 'abc', '', '1e3', '.5'])('rejects %j', (v) => {
    expect(() => AccountBalance.of(v)).toThrow(DomainException);
  });
  it('zero() is 0.00', () => {
    expect(AccountBalance.zero().value).toBe('0.00');
  });
});

describe('Currency', () => {
  it('accepts COP', () => {
    expect(Currency.of('COP').code).toBe('COP');
  });
  it.each(['cop', 'CO', 'COPS', '', '123'])('rejects %j', (v) => {
    expect(() => Currency.of(v)).toThrow(DomainException);
  });
});
