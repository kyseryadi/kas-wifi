import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';

export const create = async (request: Request, response: Response) => {
  const user = await userService.createTeamUser(request.auth!.userId, request.body);
  response.status(201).json({ success: true, message: 'User berhasil ditambahkan.', data: user });
};

export const list = async (request: Request, response: Response) => {
  const users = await userService.listTeamUsers(request.auth!.userId);
  response.json({ success: true, data: users });
};

export const update = async (request: Request, response: Response) => {
  const user = await userService.updateTeamUser(request.auth!.userId, Number(request.params.id), request.body);
  response.json({ success: true, message: 'User berhasil diperbarui.', data: user });
};

export const remove = async (request: Request, response: Response) => {
  await userService.deleteTeamUser(request.auth!.userId, Number(request.params.id));
  response.json({ success: true, message: 'User berhasil dihapus.' });
};
