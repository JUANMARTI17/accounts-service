import type { AccountModel } from '../../domain/model/AccountModel.js';
import type { GetAccountByUserIdUseCase } from '../port/in/GetAccountByUserIdUseCase.js';
import type { FindAccountByUserIdPort } from '../port/out/FindAccountByUserIdPort.js';

export class GetAccountByUserIdService implements GetAccountByUserIdUseCase {
  constructor(private readonly findAccountByUserIdPort: FindAccountByUserIdPort) {}

  execute(userId: string): Promise<AccountModel | null> {
    return this.findAccountByUserIdPort.findByUserId(userId);
  }
}
