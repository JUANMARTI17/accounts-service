import { describe, expect, it, vi } from 'vitest';
import { persisted } from '../../helpers.js';
import { CreateAccountService } from '../../../src/application/service/CreateAccountService.js';
import { AccountAlreadyExistsException } from '../../../src/domain/exception/AccountAlreadyExistsException.js';
import { AccountModel } from '../../../src/domain/model/AccountModel.js';
import { AccountBalance } from '../../../src/domain/valueobject/AccountBalance.js';
import { Currency } from '../../../src/domain/valueobject/Currency.js';
import { UserId } from '../../../src/domain/valueobject/UserId.js';

const command = { userId: 'user-1', initialBalance: '0.00', currency: 'COP' };

function setup() {
  const find = vi.fn();
  const save = vi.fn(async (a: AccountModel) => persisted(a));
  const publish = vi.fn(async () => undefined);
  const onPublishError = vi.fn();
  const service = new CreateAccountService(
    { findByUserId: find },
    { save },
    { publishAccountCreated: publish },
    onPublishError,
  );
  return { find, save, publish, onPublishError, service };
}

describe('CreateAccountService', () => {
  it('saves and publishes for a new account', async () => {
    const { find, save, publish, service } = setup();
    find.mockResolvedValue(null);

    const account = await service.execute(command);

    expect(save).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledOnce();
    expect(save.mock.invocationCallOrder[0]!).toBeLessThan(publish.mock.invocationCallOrder[0]!);
    expect(account.userId.value).toBe('user-1');
    expect(account.status).toBe('ACTIVE');
    expect(account.id.value).toBe(1);
  });

  it('throws and does not publish for a duplicate account', async () => {
    const { find, save, publish, service } = setup();
    find.mockResolvedValue(
      persisted(
        AccountModel.create(UserId.of('user-1'), AccountBalance.zero(), Currency.of('COP')),
      ),
    );

    await expect(service.execute(command)).rejects.toBeInstanceOf(AccountAlreadyExistsException);
    expect(save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('does not publish when saving fails', async () => {
    const { find, save, publish, service } = setup();
    find.mockResolvedValue(null);
    save.mockRejectedValue(new Error('db down'));

    await expect(service.execute(command)).rejects.toThrow('db down');
    expect(publish).not.toHaveBeenCalled();
  });

  it('keeps the account and reports when publishing fails', async () => {
    const { find, publish, onPublishError, service } = setup();
    find.mockResolvedValue(null);
    publish.mockRejectedValue(new Error('kafka down'));

    const account = await service.execute(command);

    expect(account.userId.value).toBe('user-1');
    expect(onPublishError).toHaveBeenCalledOnce();
  });

  it('rejects an invalid command', async () => {
    const { service } = setup();
    await expect(service.execute({ ...command, currency: 'cop' })).rejects.toThrow();
  });
});
