import { readSheet } from 'read-excel-file/node';
import { createCustomerSchema } from '../validation/customer.validation.js';
import { AppError } from './app-error.js';

export interface CustomerImportRow {
  name: string;
  address: string;
  packageName: string;
}

const headerAliases: Record<string, keyof CustomerImportRow> = {
  nama: 'name',
  name: 'name',
  nama_pelanggan: 'name',
  alamat: 'address',
  address: 'address',
  nama_paket: 'packageName',
  package_name: 'packageName',
  paket: 'packageName',
};

const normalizeHeader = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

export const parseCustomerWorkbook = async (buffer: Buffer): Promise<CustomerImportRow[]> => {
  const sheetRows = await readSheet(buffer);
  if (sheetRows.length === 0) {
    throw new AppError(422, 'File Excel tidak memiliki worksheet.', 'EMPTY_EXCEL_FILE');
  }

  const columns = new Map<keyof CustomerImportRow, number>();
  sheetRows[0]!.forEach((value, columnIndex) => {
    const mapped = headerAliases[normalizeHeader(String(value ?? ''))];
    if (mapped) columns.set(mapped, columnIndex);
  });

  const missingHeaders = (['name', 'address', 'packageName'] as const)
    .filter((field) => !columns.has(field));
  if (missingHeaders.length > 0) {
    throw new AppError(
      422,
      'Kolom Excel wajib: nama, alamat, nama_paket.',
      'INVALID_EXCEL_HEADERS',
      missingHeaders.map((field) => ({ field, message: 'Kolom tidak ditemukan.' })),
    );
  }

  const rows: CustomerImportRow[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  sheetRows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const raw = {
      name: String(row[columns.get('name')!] ?? '').trim(),
      address: String(row[columns.get('address')!] ?? '').trim(),
      packageName: String(row[columns.get('packageName')!] ?? '').trim(),
    };
    if (!raw.name && !raw.address && !raw.packageName) return;

    if (rows.length + errors.length >= 1000) {
      throw new AppError(422, 'Maksimal 1.000 pelanggan dalam satu file.', 'IMPORT_ROW_LIMIT');
    }

    const validation = createCustomerSchema.validate(raw, { abortEarly: false, stripUnknown: true });
    if (validation.error) {
      errors.push(...validation.error.details.map((detail) => ({
        row: rowNumber,
        field: detail.path.join('.'),
        message: detail.message,
      })));
      return;
    }

    rows.push(validation.value as CustomerImportRow);
  });

  if (errors.length > 0) {
    const first = errors[0]!;
    throw new AppError(422, `Data Excel tidak valid pada baris ${first.row}: ${first.message}`, 'IMPORT_VALIDATION_ERROR', errors);
  }
  if (rows.length === 0) {
    throw new AppError(422, 'File Excel tidak berisi data pelanggan.', 'EMPTY_EXCEL_DATA');
  }

  return rows;
};
