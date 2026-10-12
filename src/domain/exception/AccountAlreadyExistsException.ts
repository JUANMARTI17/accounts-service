import { DomainException } from './DomainException.js';

export class AccountAlreadyExistsException extends DomainException {
  static becauseUserIdAlreadyHasAccount(userId: string): AccountAlreadyExistsException {
    return new AccountAlreadyExistsException(`User ${userId} already has an account`);
  }
}
