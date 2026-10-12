import type { AccountModel } from '../../../domain/model/AccountModel.js';

export interface FindAccountByUserIdPort {
  findByUserId(userId: string): Promise<AccountModel | null>;
}
