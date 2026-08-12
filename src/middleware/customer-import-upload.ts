import path from 'node:path';
import multer from 'multer';
import { AppError } from '../utils/app-error.js';

const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const customerImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const isXlsx = path.extname(file.originalname).toLowerCase() === '.xlsx';
    const acceptedMime = file.mimetype === xlsxMime || file.mimetype === 'application/octet-stream';

    if (!isXlsx || !acceptedMime) {
      callback(new AppError(422, 'File harus menggunakan format Excel .xlsx.', 'INVALID_EXCEL_FILE'));
      return;
    }

    callback(null, true);
  },
}).single('file');
