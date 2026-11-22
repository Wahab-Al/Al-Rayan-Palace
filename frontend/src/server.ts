import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { Readable } from 'node:stream';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.get('/robots.txt', (_req, res) => {
  const publicSiteUrl = process.env['PUBLIC_SITE_URL']?.replace(/\/$/, '');
  res
    .type('text/plain')
    .send(
      `User-agent: *\nAllow: /\nDisallow: /admin\n${publicSiteUrl ? `Sitemap: ${publicSiteUrl}/sitemap.xml\n` : ''}`,
    );
});

app.get('/sitemap.xml', async (_req, res, next) => {
  const apiOrigin = process.env['API_ORIGIN'];
  if (!apiOrigin) {
    res.status(503).type('text').send('Sitemap service is not configured');
    return;
  }

  try {
    const sitemap = await fetch(new URL('/api/sitemap.xml', apiOrigin));
    res.status(sitemap.status);
    sitemap.headers.forEach((value, name) => res.setHeader(name, value));
    if (sitemap.body) Readable.fromWeb(sitemap.body as never).pipe(res);
    else res.end();
  } catch (error) {
    next(error);
  }
});

app.use('/api', async (req, res, next) => {
  const apiOrigin = process.env['API_ORIGIN'];
  if (!apiOrigin) {
    res.status(503).json({ message: 'API service is not configured' });
    return;
  }

  try {
    const headers = new Headers(req.headers as HeadersInit);
    headers.delete('host');
    headers.delete('connection');
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const upstream = await fetch(new URL(req.originalUrl, apiOrigin), {
      method: req.method,
      headers,
      ...(hasBody ? { body: req as never, duplex: 'half' } : {}),
    } as RequestInit);

    res.status(upstream.status);
    upstream.headers.forEach((value, name) => {
      if (name.toLowerCase() !== 'transfer-encoding' && name.toLowerCase() !== 'connection') {
        res.setHeader(name, value);
      }
    });
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    if (upstream.body) Readable.fromWeb(upstream.body as never).pipe(res);
    else res.end();
  } catch (error) {
    next(error);
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const rawPort = process.env['PORT'] ?? '4000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Angular SSR server listening on 0.0.0.0:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
