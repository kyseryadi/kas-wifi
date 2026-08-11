import { Router } from 'express';
import { UserRole } from '../generated/prisma/enums.js';
import * as controller from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createCustomerSchema, paymentSchema, updateCustomerSchema } from '../validation/customer.validation.js';

const router = Router();
router.use(authenticate, authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.CS));
router.get('/', asyncHandler(controller.list));
router.post('/', validate(createCustomerSchema), asyncHandler(controller.create));
router.patch('/:id', validate(updateCustomerSchema), asyncHandler(controller.update));
router.get('/:id/payments', asyncHandler(controller.payments));
router.post('/:id/payments', validate(paymentSchema), asyncHandler(controller.pay));

export default router;
