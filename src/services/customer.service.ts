import { IncomeSource, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import { parsePaymentMonth } from '../utils/date.js';
import type { CustomerImportRow } from '../utils/customer-import.js';

interface CustomerInput {
  name: string;
  address: string;
  packageName: string;
  amount: number;
  dueDay: number;
}

interface PaymentInput {
  paymentMonth: string;
  amount: number;
  notes?: string | null;
}

const paymentView = (payment: {
  id: number;
  paymentMonth: Date;
  amount: Prisma.Decimal;
  paidAt: Date;
  notes: string | null;
}) => ({ ...payment, amount: Number(payment.amount) });

const monthsBefore = (createdAt: Date, paymentMonth: Date) => Math.max(0,
  (paymentMonth.getUTCFullYear() - createdAt.getUTCFullYear()) * 12
  + paymentMonth.getUTCMonth()
  - createdAt.getUTCMonth(),
);

const isPastDueDay = (paymentMonth: Date, dueDay: number, isPaid: boolean) => {
  if (isPaid) return false;
  const jakartaNow = new Date(Date.now() + (7 * 60 * 60 * 1000));
  const year = paymentMonth.getUTCFullYear();
  const month = paymentMonth.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return year === jakartaNow.getUTCFullYear()
    && month === jakartaNow.getUTCMonth()
    && jakartaNow.getUTCDate() > Math.min(dueDay, lastDayOfMonth);
};

export const listCustomers = async (ownerId: number, search?: string, paymentStatus?: string, paymentMonth?: string) => {
  const selectedPaymentMonth = paymentMonth ? parsePaymentMonth(paymentMonth) : undefined;
  if (paymentStatus && !['PAID', 'UNPAID', 'OVERDUE'].includes(paymentStatus)) {
    throw new AppError(422, 'Filter status pembayaran tidak valid.', 'INVALID_PAYMENT_STATUS');
  }
  if (paymentStatus && !selectedPaymentMonth) {
    throw new AppError(422, 'Bulan pembayaran wajib diisi untuk filter status.', 'PAYMENT_MONTH_REQUIRED');
  }

  const customers = await prisma.customer.findMany({
    where: {
      ownerId,
      isActive: true,
      ...(paymentStatus === 'PAID' ? { payments: { some: { paymentMonth: selectedPaymentMonth } } } : {}),
      ...(paymentStatus === 'UNPAID' ? { payments: { none: { paymentMonth: selectedPaymentMonth } } } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { address: { contains: search } },
          { packageName: { contains: search } },
        ],
      } : {}),
    },
    include: {
      payments: { orderBy: { paymentMonth: 'desc' }, take: 1 },
      ...(selectedPaymentMonth ? {
        _count: { select: { payments: { where: { paymentMonth: selectedPaymentMonth } } } },
      } : {}),
    },
    orderBy: { name: 'asc' },
  });

  const priorPaymentCounts = selectedPaymentMonth && customers.length > 0
    ? await prisma.customerPayment.groupBy({
      by: ['customerId'],
      where: {
        ownerId,
        customerId: { in: customers.map((customer) => customer.id) },
        paymentMonth: { lt: selectedPaymentMonth },
      },
      _count: { _all: true },
    })
    : [];
  const priorPaymentCountByCustomer = new Map(
    priorPaymentCounts.map((item) => [item.customerId, item._count._all]),
  );

  const customerViews = customers.map(({ payments, ...customer }) => {
    const isPaidForMonth = '_count' in customer && customer._count.payments > 0;
    const overdueMonths = selectedPaymentMonth
      ? Math.max(0, monthsBefore(customer.createdAt, selectedPaymentMonth)
        - (priorPaymentCountByCustomer.get(customer.id) ?? 0))
        + (isPastDueDay(selectedPaymentMonth, customer.dueDay, isPaidForMonth) ? 1 : 0)
      : 0;
    const { _count: _ignored, ...customerData } = customer;
    return {
      ...customerData,
      amount: Number(customer.amount),
      isPaidForMonth,
      isOverdue: overdueMonths > 0,
      overdueMonths,
      latestPayment: payments[0] ? paymentView(payments[0]) : null,
    };
  });

  return paymentStatus === 'OVERDUE'
    ? customerViews.filter((customer) => customer.isOverdue)
    : customerViews;
};

export const createCustomer = (ownerId: number, input: CustomerInput) =>
  prisma.customer.create({ data: { ownerId, ...input } });

export const updateCustomer = async (ownerId: number, customerId: number, input: Partial<CustomerInput> & { isActive?: boolean }) => {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, ownerId } });
  if (!customer) throw new AppError(404, 'Pelanggan tidak ditemukan.', 'CUSTOMER_NOT_FOUND');
  return prisma.customer.update({ where: { id: customerId }, data: input });
};

export const deleteCustomer = async (ownerId: number, customerId: number) => {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, ownerId, isActive: true } });
  if (!customer) throw new AppError(404, 'Pelanggan tidak ditemukan.', 'CUSTOMER_NOT_FOUND');

  await prisma.customer.update({ where: { id: customerId }, data: { isActive: false } });
};

export const importCustomers = async (ownerId: number, rows: CustomerImportRow[]) => {
  const result = await prisma.customer.createMany({
    data: rows.map((row) => ({ ownerId, ...row })),
  });
  return { imported: result.count };
};

export const createPayment = async (ownerId: number, userId: number, customerId: number, input: PaymentInput) => {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, ownerId, isActive: true } });
  if (!customer) throw new AppError(404, 'Pelanggan aktif tidak ditemukan.', 'CUSTOMER_NOT_FOUND');

  const paymentMonth = parsePaymentMonth(input.paymentMonth);
  const existing = await prisma.customerPayment.findUnique({
    where: { customerId_paymentMonth: { customerId, paymentMonth } },
  });
  if (existing) throw new AppError(409, 'Tagihan bulan tersebut sudah dibayar.', 'PAYMENT_ALREADY_EXISTS');

  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.customerPayment.create({
      data: {
        ownerId,
        customerId,
        paymentMonth,
        amount: input.amount,
        notes: input.notes || null,
        receivedById: userId,
      },
    });

    const income = await transaction.income.create({
      data: {
        ownerId,
        customerPaymentId: payment.id,
        source: IncomeSource.CUSTOMER_PAYMENT,
        description: `Pembayaran ${customer.name} - ${input.paymentMonth}`,
        amount: input.amount,
        incomeDate: new Date(),
        createdById: userId,
      },
    });

    return {
      payment: paymentView(payment),
      income: { ...income, amount: Number(income.amount) },
    };
  });
};

export const listPayments = async (ownerId: number, customerId: number) => {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, ownerId } });
  if (!customer) throw new AppError(404, 'Pelanggan tidak ditemukan.', 'CUSTOMER_NOT_FOUND');

  const payments = await prisma.customerPayment.findMany({
    where: { ownerId, customerId },
    orderBy: { paymentMonth: 'desc' },
  });
  return payments.map(paymentView);
};
