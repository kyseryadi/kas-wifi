import { Router } from 'express';
import authRoutes from './auth.routes.js';
import customerRoutes from './customer.routes.js';
import financeRoutes from './finance.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/', financeRoutes);

export default router;
