import cors from 'cors';
import express from 'express';
import * as helmetModule from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import routes from './routes/index.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmetModule.default());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin tidak diizinkan oleh CORS.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.get('/health', (_request, response) => {
  response.json({
    success: true,
    data: {
      service: 'kas-wifi-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api/v1', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
