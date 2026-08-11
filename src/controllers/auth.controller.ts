import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';

export const registerOwner = async (request: Request, response: Response) => {
  const result = await authService.registerOwner(request.body);
  response.status(201).json({ success: true, message: 'Owner berhasil didaftarkan.', data: result });
};

export const loginEmail = async (request: Request, response: Response) => {
  const result = await authService.loginWithEmail(request.body);
  response.json({ success: true, message: 'Login berhasil.', data: result });
};

export const loginGoogle = async (request: Request, response: Response) => {
  const result = await authService.loginWithGoogle(request.body.credential);
  response.json({ success: true, message: 'Login Google berhasil.', data: result });
};

export const me = async (request: Request, response: Response) => {
  const user = await authService.getCurrentUser(request.auth!.userId);
  response.json({ success: true, data: user });
};
