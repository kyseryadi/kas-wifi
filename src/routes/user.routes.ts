import { Router } from 'express';
import { UserRole } from '../generated/prisma/enums.js';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createUserSchema, updateUserSchema } from '../validation/user.validation.js';

const router = Router();

router.use(authenticate, authorize(UserRole.OWNER));
router.get('/', asyncHandler(userController.list));
router.post('/', validate(createUserSchema), asyncHandler(userController.create));
router.patch('/:id', validate(updateUserSchema), asyncHandler(userController.update));
router.delete('/:id', asyncHandler(userController.remove));

export default router;
