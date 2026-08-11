import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRoute = (request: Request, response: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (handler: AsyncRoute): RequestHandler =>
  (request, response, next) => {
    void Promise.resolve(handler(request, response, next)).catch(next);
  };
