import type { Request, Response } from 'express';
import * as financeService from '../services/finance.service.js';
import { getOwnerId } from '../utils/tenant.js';

export const listIncomes = async (request: Request, response: Response) => {
  response.json({ success: true, data: await financeService.listIncomes(getOwnerId(request)) });
};

export const createIncome = async (request: Request, response: Response) => {
  const data = await financeService.createManualIncome(getOwnerId(request), request.auth!.userId, request.body);
  response.status(201).json({ success: true, message: 'Pendapatan berhasil dicatat.', data });
};

export const listExpenses = async (request: Request, response: Response) => {
  response.json({ success: true, data: await financeService.listExpenses(getOwnerId(request)) });
};

export const createExpense = async (request: Request, response: Response) => {
  const data = await financeService.createExpense(getOwnerId(request), request.auth!.userId, request.body);
  response.status(201).json({ success: true, message: 'Pengeluaran berhasil dicatat.', data });
};

export const report = async (request: Request, response: Response) => {
  const data = await financeService.getReport(
    getOwnerId(request),
    request.query.startDate as string | undefined,
    request.query.endDate as string | undefined,
  );
  response.json({ success: true, data });
};
