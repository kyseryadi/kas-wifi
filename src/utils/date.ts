import { AppError } from './app-error.js';

export const parseDateOnly = (value: string, fieldName = 'tanggal') => {
  const datePart = value.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/)?.[1];
  const date = datePart ? new Date(`${datePart}T00:00:00.000Z`) : new Date(Number.NaN);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(422, `${fieldName} tidak valid.`, 'INVALID_DATE');
  }
  return date;
};

export const parsePaymentMonth = (value: string) => parseDateOnly(`${value}-01`, 'Bulan pembayaran');

export const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start, end };
};
