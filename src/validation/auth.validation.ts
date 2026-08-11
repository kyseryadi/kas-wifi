import Joi from 'joi';

const email = Joi.string().email().max(191).lowercase().trim().required();
const password = Joi.string().min(8).max(72).required();

export const registerOwnerSchema = Joi.object({
  name: Joi.string().min(2).max(120).trim().required(),
  email,
  password,
});

export const emailLoginSchema = Joi.object({
  email,
  password: Joi.string().max(72).required(),
});

export const googleLoginSchema = Joi.object({
  credential: Joi.string().min(20).required(),
});
