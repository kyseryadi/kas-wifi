import 'dotenv/config';
import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri({ scheme: ['mysql'] }).required(),
  DATABASE_CONNECTION_LIMIT: Joi.number().integer().min(1).max(100).default(5),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_AUTO_REGISTER_OWNER: Joi.boolean().truthy('true').falsy('false').default(true),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
}).unknown(true);

const { error, value } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  throw new Error(`Konfigurasi environment tidak valid: ${error.message}`);
}

export const env = {
  nodeEnv: value.NODE_ENV as 'development' | 'test' | 'production',
  port: value.PORT as number,
  databaseUrl: value.DATABASE_URL as string,
  databaseConnectionLimit: value.DATABASE_CONNECTION_LIMIT as number,
  jwtSecret: value.JWT_SECRET as string,
  jwtExpiresIn: value.JWT_EXPIRES_IN as string,
  googleClientId: value.GOOGLE_CLIENT_ID as string,
  googleAutoRegisterOwner: value.GOOGLE_AUTO_REGISTER_OWNER as boolean,
  corsOrigins: (value.CORS_ORIGIN as string).split(',').map((origin) => origin.trim()),
  logLevel: value.LOG_LEVEL as string,
};
