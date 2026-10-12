import type pg from 'pg';
import type { FindAccountByUserIdPort } from '../../application/port/out/FindAccountByUserIdPort.js';
import type { SaveAccountPort } from '../../application/port/out/SaveAccountPort.js';
import { AccountAlreadyExistsException } from '../../domain/exception/AccountAlreadyExistsException.js';
import type { AccountModel } from '../../domain/model/AccountModel.js';
import { AccountPersistenceMapper, type AccountRow } from './AccountPersistenceMapper.js';

const UNIQUE_VIOLATION = '23505';

const COLUMNS = 'id, user_id, account_number, balance, currency, status, created_at, updated_at';

export class AccountRepositoryPg implements SaveAccountPort, FindAccountByUserIdPort {
  constructor(private readonly pool: pg.Pool) {}

  async save(account: AccountModel): Promise<AccountModel> {
    try {
      // id, created_at y updated_at los asigna la base (serial y CURRENT_TIMESTAMP).
      const result = await this.pool.query<AccountRow>(
        `INSERT INTO public.accounts (user_id, account_number, balance, currency, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${COLUMNS}`,
        [
          account.userId.value,
          account.accountNumber.value,
          account.balance.value,
          account.currency.code,
          account.status,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error('INSERT did not return a row');
      return AccountPersistenceMapper.toDomain(row);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw AccountAlreadyExistsException.becauseUserIdAlreadyHasAccount(account.userId.value);
      }
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<AccountModel | null> {
    const result = await this.pool.query<AccountRow>(
      `SELECT ${COLUMNS} FROM public.accounts WHERE user_id = $1 ORDER BY id LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    return row ? AccountPersistenceMapper.toDomain(row) : null;
  }
}
