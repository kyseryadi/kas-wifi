import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { changePasswordSchema, emailLoginSchema, googleLoginSchema, registerOwnerSchema } from '../validation/auth.validation.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak percobaan. Coba lagi nanti.' },
});

router.post('/register-owner', authLimiter, validate(registerOwnerSchema), asyncHandler(authController.registerOwner));
router.post('/login', authLimiter, validate(emailLoginSchema), asyncHandler(authController.loginEmail));
router.post('/google', authLimiter, validate(googleLoginSchema), asyncHandler(authController.loginGoogle));
router.get('/me', authenticate, asyncHandler(authController.me));
router.patch('/password', authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));

export default router;
