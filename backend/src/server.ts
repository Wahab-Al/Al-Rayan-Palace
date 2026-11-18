import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import config from './config/env.js';
import connectDB from './config/db.js';

import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import adminProductsRouter from './routes/admin-products.js';

import { requireAdmin } from './middleware/requireAdmin.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

app.use(cookieParser());

app.use(
  express.json({
    limit: '1mb',
  }),
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
  });
});

app.use('/api/auth', authRouter);

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({
    authenticated: true,
    admin: req.admin,
  });
});

app.use('/api/products', productsRouter);

app.use('/api/admin/products', adminProductsRouter);

const start = async () => {
  await connectDB(config.MONGO_URI);

  app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${config.PORT}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
