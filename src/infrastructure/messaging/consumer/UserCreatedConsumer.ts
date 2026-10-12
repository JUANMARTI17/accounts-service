import pg from 'pg';
import type { Logger } from 'pino';
import type { CreateAccountUseCase } from '../../../application/port/in/CreateAccountUseCase.js';
import { AccountAlreadyExistsException } from '../../../domain/exception/AccountAlreadyExistsException.js';
import { userCreatedEventSchema } from '../dto/UserCreatedEvent.js';

export interface IncomingMessage {
  topic: string;
  partition: number;
  offset: string;
  value: Buffer | null;
}

function errorClass(error: unknown): string {
  return error instanceof Error ? error.constructor.name : typeof error;
}

/** Campos diagnósticos de un error de pg. Deliberadamente sin `detail` (puede incluir valores). */
function dbErrorFields(error: pg.DatabaseError) {
  return {
    code: error.code,
    constraint: error.constraint,
    table: error.table,
    column: error.column,
    message: error.message,
  };
}

export class UserCreatedConsumer {
  constructor(
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly logger: Pick<Logger, 'debug' | 'info' | 'error'>,
  ) {}

  /** Nunca relanza: un mensaje defectuoso no debe provocar reprocesos en bucle. */
  async handle(message: IncomingMessage): Promise<void> {
    const where = { topic: message.topic, partition: message.partition, offset: message.offset };

    let raw: unknown;
    try {
      raw = JSON.parse(message.value?.toString('utf-8') ?? '');
    } catch (error) {
      this.logger.error({ ...where, errorClass: errorClass(error) }, 'invalid JSON in message');
      return;
    }

    const parsed = userCreatedEventSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.error({ ...where, errorClass: 'ZodError' }, 'message failed schema validation');
      return;
    }
    const event = parsed.data;

    if (event.eventType !== 'USER_CREATED') {
      this.logger.debug({ ...where, eventId: event.eventId }, 'event type ignored');
      return;
    }

    try {
      const account = await this.createAccountUseCase.execute({
        userId: event.aggregateId,
        initialBalance: '0.00',
        currency: 'COP',
      });
      this.logger.info(
        {
          ...where,
          eventId: event.eventId,
          userId: event.aggregateId,
          accountId: account.id.toString(),
        },
        'account created',
      );
    } catch (error) {
      if (error instanceof AccountAlreadyExistsException) {
        this.logger.debug(
          { ...where, eventId: event.eventId, userId: event.aggregateId },
          'event ignored (idempotency)',
        );
        return;
      }
      this.logger.error(
        {
          ...where,
          eventId: event.eventId,
          errorClass: errorClass(error),
          ...(error instanceof pg.DatabaseError ? dbErrorFields(error) : {}),
        },
        'failed to create account',
      );
    }
  }
}
