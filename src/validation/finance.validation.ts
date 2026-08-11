import Joi from 'joi';

const dateOnly = Joi.string().isoDate();

export const createIncomeSchema = Joi.object({
  description: Joi.string().min(2).max(255).trim().required(),
  amount: Joi.number().positive().precision(2).max(9999999999999.99).required(),
  incomeDate: dateOnly.required(),
});

export const createExpenseSchema = Joi.object({
  description: Joi.string().min(2).max(255).trim().required(),
  amount: Joi.number().positive().precision(2).max(9999999999999.99).required(),
  expenseDate: dateOnly.required(),
});
