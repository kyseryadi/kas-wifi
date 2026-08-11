import Joi from 'joi';

export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(120).trim().required(),
  address: Joi.string().min(3).max(1000).trim().required(),
  packageName: Joi.string().min(2).max(120).trim().required(),
});

export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(120).trim(),
  address: Joi.string().min(3).max(1000).trim(),
  packageName: Joi.string().min(2).max(120).trim(),
  isActive: Joi.boolean(),
}).min(1);

export const paymentSchema = Joi.object({
  paymentMonth: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).required().messages({
    'string.pattern.base': 'Bulan pembayaran harus menggunakan format YYYY-MM.',
  }),
  amount: Joi.number().positive().precision(2).max(9999999999999.99).required(),
  notes: Joi.string().max(255).trim().allow('', null),
});
