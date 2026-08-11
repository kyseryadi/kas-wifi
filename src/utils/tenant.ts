import type { Request } from 'express';

export const getOwnerId = (request: Request) => {
  const auth = request.auth!;
  return auth.parentId === 0 ? auth.userId : auth.parentId;
};
