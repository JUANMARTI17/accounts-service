import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
};

export function createErrorHandler(logger: Pick<Logger, 'error'>): ErrorRequestHandler {
  return (error, _req, res, _next) => {
    logger.error(
      { errorClass: error instanceof Error ? error.constructor.name : typeof error },
      'unhandled http error',
    );
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
  };
}
