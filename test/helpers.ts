import { AccountModel } from '../src/domain/model/AccountModel.js';
import { AccountId } from '../src/domain/valueobject/AccountId.js';

/** Simula el guardado: la base asigna el id entero. */
export function persisted(account: AccountModel, id = 1): AccountModel {
  return AccountModel.restore({
    id: AccountId.of(id),
    userId: account.userId,
    accountNumber: account.accountNumber,
    balance: account.balance,
    currency: account.currency,
    status: account.status,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  });
}
