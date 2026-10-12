import type { AccountModel } from '../../../domain/model/AccountModel.js';
import type { CreateAccountCommand } from '../../service/dto/CreateAccountCommand.js';

export interface CreateAccountUseCase {
  execute(command: CreateAccountCommand): Promise<AccountModel>;
}
