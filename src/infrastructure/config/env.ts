import 'dotenv/config';
import { z } from 'zod';

const placeholder = (v: string) => /<[^>]*>/.test(v);

const required = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !placeholder(v), { message: 'still has a <...> placeholder' });

const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8081),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DB_HOST: required,
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: required,
  DB_USERNAME: required,
  DB_PASSWORD: required,
  DB_SSL: booleanString.default(true),
  DB_SSL_CA: z.string().trim().optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(5),

  KAFKA_CLIENT_ID: required,
  KAFKA_BOOTSTRAP_SERVERS: required,
  KAFKA_USERNAME: required,
  KAFKA_PASSWORD: required,
  KAFKA_SSL_CA_LOCATION: required,
  KAFKA_GROUP_ID: required,
  KAFKA_TOPIC_USER_CREATED: required,
  KAFKA_TOPIC_ACCOUNT_CREATED: required,
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Solo se nombran las variables; nunca se imprimen sus valores.
    const lines = result.error.issues.map(
      (issue) =>
        `  - ${issue.path.join('.')}: ${issue.message === 'Invalid input' ? 'invalid or missing' : issue.message}`,
    );
    console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
    process.exit(1);
  }
  return result.data;
}
