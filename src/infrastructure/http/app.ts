import express, { type Express } from 'express';
import type { Logger } from 'pino';
import type { GetAccountByUserIdUseCase } from '../../application/port/in/GetAccountByUserIdUseCase.js';
import { createAccountRouter } from './AccountController.js';
import { createErrorHandler, notFoundHandler } from './errorHandler.js';

export function createApp(getAccountByUserId: GetAccountByUserIdUseCase, logger: Logger): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(createAccountRouter(getAccountByUserId));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
