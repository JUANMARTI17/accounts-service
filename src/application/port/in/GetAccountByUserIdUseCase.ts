import type { AccountModel } from '../../../domain/model/AccountModel.js';

export interface GetAccountByUserIdUseCase {
  execute(userId: string): Promise<AccountModel | null>;
}
