import Joi from 'joi';
import { UserRole } from '../generated/prisma/enums.js';

const assignableRoles = [UserRole.ADMIN, UserRole.CS];

export const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(120).trim().required(),
  email: Joi.string().email().max(191).lowercase().trim().required(),
  password: Joi.string().min(8).max(72).required(),
  role: Joi.string().valid(...assignableRoles).required(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(120).trim(),
  password: Joi.string().min(8).max(72),
  role: Joi.string().valid(...assignableRoles),
  isActive: Joi.boolean(),
}).min(1);
