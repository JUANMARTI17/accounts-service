import fs from 'node:fs';
import pg from 'pg';
import type { Env } from '../config/env.js';

// pg devuelve NUMERIC como string por defecto; no se registra ningún parser a number.
// TIMESTAMP (sin zona, oid 1114) se interpreta como UTC, que es como lo guarda la base.
pg.types.setTypeParser(1114, (value: string) => new Date(`${value.replace(' ', 'T')}Z`));

export function createPgPool(env: Env): pg.Pool {
  let ssl: pg.PoolConfig['ssl'] = false;
  if (env.DB_SSL) {
    ssl = env.DB_SSL_CA
      ? { ca: fs.readFileSync(env.DB_SSL_CA, 'utf-8'), rejectUnauthorized: true }
      : { rejectUnauthorized: false };
  }
  return new pg.Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    max: env.DB_POOL_MAX,
    ssl,
  });
}
