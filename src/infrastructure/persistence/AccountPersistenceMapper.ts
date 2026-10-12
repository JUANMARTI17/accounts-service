import { isAccountStatus } from '../../domain/enums/AccountStatus.js';
import { AccountModel } from '../../domain/model/AccountModel.js';
import { AccountBalance } from '../../domain/valueobject/AccountBalance.js';
import { AccountId } from '../../domain/valueobject/AccountId.js';
import { AccountNumber } from '../../domain/valueobject/AccountNumber.js';
import { Currency } from '../../domain/valueobject/Currency.js';
import { UserId } from '../../domain/valueobject/UserId.js';

export interface AccountRow {
  id: number;
  user_id: string;
  account_number: string;
  balance: string;
  currency: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export const AccountPersistenceMapper = {
  toDomain(row: AccountRow): AccountModel {
    if (!isAccountStatus(row.status)) {
      throw new Error('Unknown account status in database');
    }
    return AccountModel.restore({
      id: AccountId.of(row.id),
      userId: UserId.of(row.user_id),
      accountNumber: AccountNumber.of(row.account_number),
      balance: AccountBalance.of(row.balance),
      currency: Currency.of(row.currency),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  },
};
