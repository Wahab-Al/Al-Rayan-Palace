import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import multer from 'multer';

import config from './config/env.js';
import connectDB from './config/db.js';
import Product from './models/product.js';

import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import adminProductsRouter from './routes/admin-products.js';

import { requireAdmin } from './middleware/requireAdmin.js';

const app = express();
app.set('trust proxy', 1);

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

const publicApiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300 });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
  });
});

app.get('/api/ready', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ok: ready, database: ready ? 'connected' : 'unavailable' });
});

app.get('/api/sitemap.xml', async (_req, res) => {
  try {
    const siteOrigin = new URL(config.FRONTEND_ORIGIN).origin;
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.write('<?xml version="1.0" encoding="UTF-8"?>');
    res.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    res.write(`<url><loc>${siteOrigin}/</loc></url>`);

    const cursor = Product.find().select({ _id: 1, updatedAt: 1 }).lean().cursor();
    for await (const product of cursor) {
      const lastmod = product.updatedAt?.toISOString();
      res.write(
        `<url><loc>${siteOrigin}/products/${product._id.toString()}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
      );
    }

    res.end('</urlset>');
  } catch {
    if (!res.headersSent) res.status(500).type('text').send('Unable to generate sitemap');
    else res.end();
  }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({
    authenticated: true,
    admin: req.admin,
  });
});

app.use('/api/products', publicApiLimiter, productsRouter);

app.use('/api/admin/products', adminProductsRouter);

app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Each media file must be 25MB or smaller'
            : 'Upload up to 3 images or a single video',
      });
      return;
    }

    if (error instanceof Error && error.message === 'Unsupported media type') {
      res.status(400).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: 'Server error' });
  },
);

const start = async () => {
  await connectDB(config.MONGO_URI, config.MONGO_MAX_POOL_SIZE, config.MONGO_DNS_SERVERS);

  app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${config.PORT}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
