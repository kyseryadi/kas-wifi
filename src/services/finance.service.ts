import { IncomeSource } from '../generated/prisma/enums.js';
import { prisma } from '../config/prisma.js';
import { currentMonthRange, parseDateOnly } from '../utils/date.js';

interface IncomeInput { description: string; amount: number; incomeDate: string }
interface ExpenseInput { description: string; amount: number; expenseDate: string }

const moneyView = <T extends { amount: unknown }>(record: T) => ({
  ...record,
  amount: Number(record.amount),
});

export const listIncomes = async (ownerId: number) => {
  const records = await prisma.income.findMany({
    where: { ownerId },
    include: { customerPayment: { include: { customer: true } } },
    orderBy: [{ incomeDate: 'desc' }, { id: 'desc' }],
  });
  return records.map(moneyView);
};

export const createManualIncome = async (ownerId: number, userId: number, input: IncomeInput) => {
  const record = await prisma.income.create({
    data: {
      ownerId,
      source: IncomeSource.MANUAL,
      description: input.description,
      amount: input.amount,
      incomeDate: parseDateOnly(input.incomeDate, 'Tanggal pendapatan'),
      createdById: userId,
    },
  });
  return moneyView(record);
};

export const listExpenses = async (ownerId: number) => {
  const records = await prisma.expense.findMany({
    where: { ownerId },
    orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
  });
  return records.map(moneyView);
};

export const createExpense = async (ownerId: number, userId: number, input: ExpenseInput) => {
  const record = await prisma.expense.create({
    data: {
      ownerId,
      description: input.description,
      amount: input.amount,
      expenseDate: parseDateOnly(input.expenseDate, 'Tanggal pengeluaran'),
      createdById: userId,
    },
  });
  return moneyView(record);
};

export const getReport = async (ownerId: number, startDate?: string, endDate?: string) => {
  const fallback = currentMonthRange();
  const start = startDate ? parseDateOnly(startDate, 'Tanggal mulai') : fallback.start;
  const end = endDate ? parseDateOnly(endDate, 'Tanggal akhir') : fallback.end;

  const [incomeAggregate, expenseAggregate, incomes, expenses] = await Promise.all([
    prisma.income.aggregate({ where: { ownerId, incomeDate: { gte: start, lte: end } }, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { ownerId, expenseDate: { gte: start, lte: end } }, _sum: { amount: true }, _count: true }),
    prisma.income.findMany({ where: { ownerId, incomeDate: { gte: start, lte: end } }, orderBy: { incomeDate: 'desc' } }),
    prisma.expense.findMany({ where: { ownerId, expenseDate: { gte: start, lte: end } }, orderBy: { expenseDate: 'desc' } }),
  ]);

  const totalIncome = Number(incomeAggregate._sum.amount ?? 0);
  const totalExpense = Number(expenseAggregate._sum.amount ?? 0);
  return {
    period: { start, end },
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeCount: incomeAggregate._count,
      expenseCount: expenseAggregate._count,
    },
    incomes: incomes.map(moneyView),
    expenses: expenses.map(moneyView),
  };
};
