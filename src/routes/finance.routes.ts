import { Router } from 'express';
import { UserRole } from '../generated/prisma/enums.js';
import * as controller from '../controllers/finance.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createExpenseSchema, createIncomeSchema } from '../validation/finance.validation.js';

const router = Router();
router.use(authenticate);
router.get('/incomes', authorize(UserRole.OWNER, UserRole.ADMIN), asyncHandler(controller.listIncomes));
router.post('/incomes', authorize(UserRole.OWNER, UserRole.ADMIN), validate(createIncomeSchema), asyncHandler(controller.createIncome));
router.get('/expenses', authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.CS), asyncHandler(controller.listExpenses));
router.post('/expenses', authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.CS), validate(createExpenseSchema), asyncHandler(controller.createExpense));
router.get('/reports/summary', authorize(UserRole.OWNER, UserRole.ADMIN), asyncHandler(controller.report));

export default router;
