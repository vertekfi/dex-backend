import { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Context {
      accountAddress: string | null;
      adminApiKey: string | null;
    }
  }
}

function getHeader(req: Request, key: string): string | undefined {
  const value = req.headers[key.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export async function accountMiddleware(req, res: Response, next: NextFunction) {
  const accountAddress = getHeader(req, 'AccountAddress');
  const adminApiKey = getHeader(req, 'AdminApiKey');

  req.context = req.context || {};

  req.context.accountAddress = accountAddress ? accountAddress.toLowerCase() : null;
  req.context.adminApiKey = adminApiKey ?? null;

  next();
}
