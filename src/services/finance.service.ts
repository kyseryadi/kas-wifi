import { IncomeSource } from '../generated/prisma/enums.js';
import { prisma } from '../config/prisma.js';
import { currentMonthRange, parseDateOnly } from '../utils/date.js';
import { AppError } from '../utils/app-error.js';

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

const percentageReportYear = (value?: string) => {
  const jakartaNow = new Date(Date.now() + (7 * 60 * 60 * 1000));
  const fallbackYear = jakartaNow.getUTCFullYear();
  if (!value) return fallbackYear;
  if (!/^\d{4}$/.test(value)) throw new AppError(422, 'Tahun harus menggunakan format YYYY.', 'INVALID_REPORT_YEAR');
  const year = Number(value);
  if (year < 2000 || year > 2100) throw new AppError(422, 'Tahun laporan harus antara 2000 dan 2100.', 'INVALID_REPORT_YEAR');
  return year;
};

export const getPercentageReport = async (ownerId: number, yearValue?: string) => {
  const year = percentageReportYear(yearValue);
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const jakartaOffsetMs = 7 * 60 * 60 * 1000;
  const paymentStart = new Date(start.getTime() - jakartaOffsetMs);
  const paymentEnd = new Date(end.getTime() - jakartaOffsetMs);

  const [incomes, megaDataExpenses, payments] = await Promise.all([
    prisma.income.findMany({
      where: { ownerId, incomeDate: { gte: start, lt: end } },
      select: { incomeDate: true, amount: true },
    }),
    prisma.expense.findMany({
      where: {
        ownerId,
        expenseDate: { gte: start, lt: end },
        description: { contains: 'MEGA DATA', mode: 'insensitive' },
      },
      select: { expenseDate: true, amount: true },
    }),
    prisma.customerPayment.findMany({
      where: { ownerId, paidAt: { gte: paymentStart, lt: paymentEnd } },
      select: { customerId: true, paidAt: true },
    }),
  ]);

  const monthlyIncome = Array<number>(12).fill(0);
  const monthlyMegaDataExpense = Array<number>(12).fill(0);
  const monthlyPaidCustomers = Array.from({ length: 12 }, () => new Set<number>());

  incomes.forEach((income) => {
    monthlyIncome[income.incomeDate.getUTCMonth()]! += Number(income.amount);
  });
  megaDataExpenses.forEach((expense) => {
    monthlyMegaDataExpense[expense.expenseDate.getUTCMonth()]! += Number(expense.amount);
  });
  payments.forEach((payment) => {
    const jakartaPaidAt = new Date(payment.paidAt.getTime() + jakartaOffsetMs);
    monthlyPaidCustomers[jakartaPaidAt.getUTCMonth()]!.add(payment.customerId);
  });

  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const totalIncome = monthlyIncome[monthIndex]!;
    const megaDataExpense = monthlyMegaDataExpense[monthIndex]!;
    const paidCustomerCount = monthlyPaidCustomers[monthIndex]!.size;
    const customerDeduction = paidCustomerCount * 10_000;
    const percentageBase = totalIncome - megaDataExpense - customerDeduction;
    const percentageAmount = percentageBase * 0.2;
    const customerAddition = paidCustomerCount * 5_000;
    return {
      month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      totalIncome,
      megaDataExpense,
      paidCustomerCount,
      customerDeduction,
      percentageBase,
      percentageAmount,
      customerAddition,
      result: percentageAmount + customerAddition,
    };
  });

  return {
    year,
    formula: {
      percentageRate: 20,
      deductionPerPaidCustomer: 10_000,
      additionPerPaidCustomer: 5_000,
    },
    summary: months.reduce((summary, month) => ({
      totalIncome: summary.totalIncome + month.totalIncome,
      megaDataExpense: summary.megaDataExpense + month.megaDataExpense,
      paidCustomerCount: summary.paidCustomerCount + month.paidCustomerCount,
      result: summary.result + month.result,
    }), { totalIncome: 0, megaDataExpense: 0, paidCustomerCount: 0, result: 0 }),
    months,
  };
};
const getPeriodReport = async (ownerId: number, start: Date, end: Date) => {
  const [incomeAggregate, expenseAggregate, incomes, expenses] = await Promise.all([
    prisma.income.aggregate({ where: { ownerId, incomeDate: { gte: start, lte: end } }, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { ownerId, expenseDate: { gte: start, lte: end } }, _sum: { amount: true }, _count: true }),
    prisma.income.findMany({ where: { ownerId, incomeDate: { gte: start, lte: end } }, orderBy: { incomeDate: 'desc' } }),
    prisma.expense.findMany({ where: { ownerId, expenseDate: { gte: start, lte: end } }, orderBy: { expenseDate: 'desc' } }),
  ]);

  const reportYears = Array.from(
    { length: end.getUTCFullYear() - start.getUTCFullYear() + 1 },
    (_, index) => start.getUTCFullYear() + index,
  );
  const percentageReports = await Promise.all(
    reportYears.map((year) => getPercentageReport(ownerId, String(year))),
  );
  const calculatedExpenses = percentageReports.flatMap((percentageReport) =>
    percentageReport.months.flatMap((month, monthIndex) => {
      const expenseDate = new Date(Date.UTC(percentageReport.year, monthIndex + 1, 0));
      const hasActivity = month.totalIncome !== 0
        || month.megaDataExpense !== 0
        || month.paidCustomerCount !== 0
        || month.result !== 0;
      if (!hasActivity || expenseDate < start || expenseDate > end) return [];

      const monthName = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(expenseDate);
      return [{
        id: -(percentageReport.year * 100 + monthIndex + 1),
        description: `Hasil presentase ${monthName}`,
        amount: month.result,
        expenseDate,
        isCalculated: true,
        percentageCalculation: {
          totalIncome: month.totalIncome,
          megaDataExpense: month.megaDataExpense,
          paidCustomerCount: month.paidCustomerCount,
          customerDeduction: month.customerDeduction,
          percentageBase: month.percentageBase,
          percentageAmount: month.percentageAmount,
          customerAddition: month.customerAddition,
        },
      }];
    }),
  );

  const totalIncome = Number(incomeAggregate._sum.amount ?? 0);
  const calculatedPercentageExpense = calculatedExpenses.reduce((total, expense) => total + expense.amount, 0);
  const totalExpense = Number(expenseAggregate._sum.amount ?? 0) + calculatedPercentageExpense;
  const reportExpenses = [
    ...expenses.map(moneyView),
    ...calculatedExpenses,
  ].sort((first, second) => second.expenseDate.getTime() - first.expenseDate.getTime());

  return {
    period: { start, end },
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeCount: incomeAggregate._count,
      expenseCount: expenseAggregate._count + calculatedExpenses.length,
    },
    incomes: incomes.map(moneyView),
    expenses: reportExpenses,
  };
};

const jakartaCurrentMonthStart = () => {
  const jakartaOffsetMs = 7 * 60 * 60 * 1000;
  const jakartaNow = new Date(Date.now() + jakartaOffsetMs);
  return new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), 1));
};

export const ensureMonthlyClosings = async (ownerId: number) => {
  const currentMonthStart = jakartaCurrentMonthStart();
  let latestClosing = await prisma.monthlyClosing.findFirst({
    where: { ownerId },
    orderBy: { month: 'desc' },
  });

  let monthStart: Date;
  if (latestClosing) {
    monthStart = new Date(Date.UTC(
      latestClosing.month.getUTCFullYear(),
      latestClosing.month.getUTCMonth() + 1,
      1,
    ));
  } else {
    const [firstIncome, firstExpense] = await Promise.all([
      prisma.income.aggregate({ where: { ownerId }, _min: { incomeDate: true } }),
      prisma.expense.aggregate({ where: { ownerId }, _min: { expenseDate: true } }),
    ]);
    const firstDates = [firstIncome._min.incomeDate, firstExpense._min.expenseDate]
      .filter((date): date is Date => date instanceof Date)
      .sort((first, second) => first.getTime() - second.getTime());
    if (!firstDates[0]) return null;
    monthStart = new Date(Date.UTC(firstDates[0].getUTCFullYear(), firstDates[0].getUTCMonth(), 1));
  }

  while (monthStart < currentMonthStart) {
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
    const report = await getPeriodReport(ownerId, monthStart, monthEnd);
    const openingBalance = Number(latestClosing?.closingBalance ?? 0);
    const closingBalance = openingBalance + report.summary.totalIncome - report.summary.totalExpense;

    latestClosing = await prisma.monthlyClosing.upsert({
      where: { ownerId_month: { ownerId, month: monthStart } },
      update: {},
      create: {
        ownerId,
        month: monthStart,
        openingBalance,
        totalIncome: report.summary.totalIncome,
        totalExpense: report.summary.totalExpense,
        closingBalance,
      },
    });
    monthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  }

  return latestClosing;
};

export const closeAllOwners = async () => {
  const owners = await prisma.user.findMany({
    where: { parentId: 0, isActive: true },
    select: { id: true },
  });
  let latestClosingCount = 0;
  for (const owner of owners) {
    const closing = await ensureMonthlyClosings(owner.id);
    if (closing) latestClosingCount += 1;
  }
  return { processedOwners: owners.length, ownersWithClosing: latestClosingCount };
};
export const getReport = async (ownerId: number, startDate?: string, endDate?: string) => {
  const fallback = currentMonthRange();
  const start = startDate ? parseDateOnly(startDate, 'Tanggal mulai') : fallback.start;
  const end = endDate ? parseDateOnly(endDate, 'Tanggal akhir') : fallback.end;
  if (end < start) throw new AppError(422, 'Tanggal akhir tidak boleh sebelum tanggal mulai.', 'INVALID_REPORT_PERIOD');

  await ensureMonthlyClosings(ownerId);
  const report = await getPeriodReport(ownerId, start, end);
  const reportMonthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const previousClosing = await prisma.monthlyClosing.findFirst({
    where: { ownerId, month: { lt: reportMonthStart } },
    orderBy: { month: 'desc' },
  });
  const openingBalance = Number(previousClosing?.closingBalance ?? 0);

  return {
    ...report,
    summary: {
      ...report.summary,
      openingBalance,
      balance: openingBalance + report.summary.totalIncome - report.summary.totalExpense,
    },
    openingBalanceSource: previousClosing ? {
      month: previousClosing.month,
      closedAt: previousClosing.closedAt,
    } : null,
  };
};
