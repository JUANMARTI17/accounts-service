import { Router } from 'express';
import type { GetAccountByUserIdUseCase } from '../../application/port/in/GetAccountByUserIdUseCase.js';
import type { AccountModel } from '../../domain/model/AccountModel.js';

function toResponse(account: AccountModel) {
  return {
    accountId: account.id.toString(),
    userId: account.userId.value,
    balance: account.balance.value,
    currency: account.currency.code,
    status: account.status,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export function createAccountRouter(getAccountByUserId: GetAccountByUserIdUseCase): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP' });
  });

  router.get('/api/accounts/user/:userId', async (req, res) => {
    const account = await getAccountByUserId.execute(String(req.params.userId));
    if (!account) {
      res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'Account not found for user' });
      return;
    }
    res.status(200).json(toResponse(account));
  });

  return router;
}
