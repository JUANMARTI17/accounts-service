import type { Server } from 'node:http';
import { CreateAccountService } from './application/service/CreateAccountService.js';
import { GetAccountByUserIdService } from './application/service/GetAccountByUserIdService.js';
import { loadEnv } from './infrastructure/config/env.js';
import { createLogger } from './infrastructure/config/logger.js';
import { createApp } from './infrastructure/http/app.js';
import { createKafka } from './infrastructure/messaging/kafkaClient.js';
import { UserCreatedConsumer } from './infrastructure/messaging/consumer/UserCreatedConsumer.js';
import { KafkaAccountEventPublisher } from './infrastructure/messaging/KafkaAccountEventPublisher.js';
import { AccountRepositoryPg } from './infrastructure/persistence/AccountRepositoryPg.js';
import { createPgPool } from './infrastructure/persistence/pgPool.js';

const errorClass = (error: unknown): string =>
  error instanceof Error ? error.constructor.name : typeof error;

async function main(): Promise<void> {
  // 1. Entorno
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV);

  // 2. Composition root (inyección manual)
  const pool = createPgPool(env);
  const repository = new AccountRepositoryPg(pool);
  const kafka = createKafka(env);
  const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
  const publisher = new KafkaAccountEventPublisher(producer, env.KAFKA_TOPIC_ACCOUNT_CREATED);
  const createAccount = new CreateAccountService(
    repository,
    repository,
    publisher,
    (error, accountId) =>
      logger.error(
        { accountId, errorClass: errorClass(error) },
        'failed to publish ACCOUNT_CREATED after saving account',
      ),
  );
  const getAccountByUserId = new GetAccountByUserIdService(repository);
  const userCreatedConsumer = new UserCreatedConsumer(createAccount, logger);
  const consumer = kafka.consumer({ groupId: env.KAFKA_GROUP_ID });

  // 3. Verificar la base de datos
  await pool.query('SELECT 1');
  logger.info('database connection verified');

  // 4. Kafka: producer, luego consumer
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: env.KAFKA_TOPIC_USER_CREATED, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await userCreatedConsumer.handle({
        topic,
        partition,
        offset: message.offset,
        value: message.value,
      });
    },
  });
  logger.info({ topic: env.KAFKA_TOPIC_USER_CREATED }, 'kafka consumer running');

  // 5. HTTP
  const app = createApp(getAccountByUserId, logger);
  const server: Server = app.listen(env.PORT, () =>
    logger.info({ port: env.PORT }, 'http server listening'),
  );

  // 6. Apagado limpio
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    try {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await consumer.disconnect();
      await producer.disconnect();
      await pool.end();
      process.exit(0);
    } catch (error) {
      logger.error({ errorClass: errorClass(error) }, 'error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(`Startup failed: ${message}`);
  process.exit(1);
});
