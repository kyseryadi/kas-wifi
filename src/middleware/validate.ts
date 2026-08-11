import type { RequestHandler } from 'express';
import type Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema): RequestHandler =>
  (request, response, next) => {
    const { error, value } = schema.validate(request.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      response.status(422).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim tidak valid.',
        errors: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
      return;
    }

    request.body = value;
    next();
  };
