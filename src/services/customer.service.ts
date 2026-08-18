import { IncomeSource, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import { parsePaymentMonth } from '../utils/date.js';
import type { CustomerImportRow } from '../utils/customer-import.js';

interface CustomerInput {
  name: string;
  address: string;
  packageName: string;
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

export const listCustomers = async (ownerId: number, search?: string, paymentStatus?: string, paymentMonth?: string) => {
  const selectedPaymentMonth = paymentMonth ? parsePaymentMonth(paymentMonth) : undefined;
  if (paymentStatus && !['PAID', 'UNPAID'].includes(paymentStatus)) {
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

  return customers.map(({ payments, ...customer }) => ({
    ...customer,
    isPaidForMonth: '_count' in customer && customer._count.payments > 0,
    ...('_count' in customer ? { _count: undefined } : {}),
    latestPayment: payments[0] ? paymentView(payments[0]) : null,
  }));
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
