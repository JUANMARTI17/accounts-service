import type { AccountModel } from '../../../domain/model/AccountModel.js';

export interface SaveAccountPort {
  /** Lanza AccountAlreadyExistsException si el usuario ya tiene cuenta. */
  save(account: AccountModel): Promise<AccountModel>;
}
