import { AccountCreatedDomainEvent } from '../../domain/event/AccountCreatedDomainEvent.js';
import { AccountAlreadyExistsException } from '../../domain/exception/AccountAlreadyExistsException.js';
import { AccountModel } from '../../domain/model/AccountModel.js';
import { AccountBalance } from '../../domain/valueobject/AccountBalance.js';
import { Currency } from '../../domain/valueobject/Currency.js';
import { UserId } from '../../domain/valueobject/UserId.js';
import type { CreateAccountUseCase } from '../port/in/CreateAccountUseCase.js';
import type { AccountEventPublisherPort } from '../port/out/AccountEventPublisherPort.js';
import type { FindAccountByUserIdPort } from '../port/out/FindAccountByUserIdPort.js';
import type { SaveAccountPort } from '../port/out/SaveAccountPort.js';
import {
  createAccountCommandSchema,
  type CreateAccountCommand,
} from './dto/CreateAccountCommand.js';

/** Registra errores de publicación sin exponer datos sensibles. */
export type PublishErrorHandler = (error: unknown, accountId: string) => void;

export class CreateAccountService implements CreateAccountUseCase {
  constructor(
    private readonly findAccountByUserIdPort: FindAccountByUserIdPort,
    private readonly saveAccountPort: SaveAccountPort,
    private readonly eventPublisherPort: AccountEventPublisherPort,
    private readonly onPublishError: PublishErrorHandler = () => undefined,
  ) {}

  async execute(command: CreateAccountCommand): Promise<AccountModel> {
    const { userId, initialBalance, currency } = createAccountCommandSchema.parse(command);

    const existing = await this.findAccountByUserIdPort.findByUserId(userId);
    if (existing) {
      throw AccountAlreadyExistsException.becauseUserIdAlreadyHasAccount(userId);
    }

    const account = AccountModel.create(
      UserId.of(userId),
      AccountBalance.of(initialBalance),
      Currency.of(currency),
    );
    const saved = await this.saveAccountPort.save(account);

    // Siempre después de guardar. Si falla, no se revierte la cuenta (limitación conocida: sin outbox).
    try {
      await this.eventPublisherPort.publishAccountCreated(AccountCreatedDomainEvent.from(saved));
    } catch (error) {
      this.onPublishError(error, saved.id.toString());
    }

    return saved;
  }
}
