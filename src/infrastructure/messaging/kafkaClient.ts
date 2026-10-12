import fs from 'node:fs';
import path from 'node:path';
import { Kafka, logLevel } from 'kafkajs';
import type { Env } from '../config/env.js';

export function createKafka(env: Env): Kafka {
  const caPath = path.resolve(env.KAFKA_SSL_CA_LOCATION);
  if (!fs.existsSync(caPath)) {
    throw new Error(`Kafka CA certificate not found at: ${caPath}`);
  }
  return new Kafka({
    clientId: env.KAFKA_CLIENT_ID,
    brokers: env.KAFKA_BOOTSTRAP_SERVERS.split(',').map((b) => b.trim()),
    ssl: { ca: [fs.readFileSync(caPath, 'utf-8')] },
    sasl: { mechanism: 'plain', username: env.KAFKA_USERNAME, password: env.KAFKA_PASSWORD },
    logLevel: logLevel.WARN,
  });
}
