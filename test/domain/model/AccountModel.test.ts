import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../src/domain/exception/DomainException.js';
import { AccountModel } from '../../../src/domain/model/AccountModel.js';
import { AccountBalance } from '../../../src/domain/valueobject/AccountBalance.js';
import { Currency } from '../../../src/domain/valueobject/Currency.js';
import { UserId } from '../../../src/domain/valueobject/UserId.js';

describe('AccountModel.create', () => {
  it('creates an ACTIVE account without id and with an account number', () => {
    const a = AccountModel.create(UserId.of('u1'), AccountBalance.zero(), Currency.of('COP'));
    expect(a.status).toBe('ACTIVE');
    expect(a.balance.value).toBe('0.00');
    expect(a.currency.code).toBe('COP');
    expect(a.userId.value).toBe('u1');
    expect(a.accountNumber.value).toMatch(/^ACC-\d{10}$/);
    expect(() => a.id).toThrow(DomainException);
    expect(a.createdAt).toEqual(a.updatedAt);
  });
});
