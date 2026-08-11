import type { Request, Response } from 'express';
import * as customerService from '../services/customer.service.js';
import { getOwnerId } from '../utils/tenant.js';

const idFrom = (request: Request) => Number(request.params.id);

export const list = async (request: Request, response: Response) => {
  const data = await customerService.listCustomers(getOwnerId(request), request.query.search as string | undefined);
  response.json({ success: true, data });
};

export const create = async (request: Request, response: Response) => {
  const data = await customerService.createCustomer(getOwnerId(request), request.body);
  response.status(201).json({ success: true, message: 'Pelanggan berhasil ditambahkan.', data });
};

export const update = async (request: Request, response: Response) => {
  const data = await customerService.updateCustomer(getOwnerId(request), idFrom(request), request.body);
  response.json({ success: true, message: 'Pelanggan berhasil diperbarui.', data });
};

export const pay = async (request: Request, response: Response) => {
  const data = await customerService.createPayment(getOwnerId(request), request.auth!.userId, idFrom(request), request.body);
  response.status(201).json({ success: true, message: 'Pembayaran berhasil dan pendapatan telah dicatat.', data });
};

export const payments = async (request: Request, response: Response) => {
  const data = await customerService.listPayments(getOwnerId(request), idFrom(request));
  response.json({ success: true, data });
};
