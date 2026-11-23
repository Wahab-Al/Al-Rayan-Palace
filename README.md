# Al Rayan Palace Store

Online furniture catalog for Al Rayan Palace. The project contains an Angular storefront with server-side rendering (SSR), an Express API, MongoDB for product data, and Cloudinary for product media.

## Project structure

```text
backend/   Express 5 API, MongoDB models, admin authentication and media uploads
frontend/  Angular 22 storefront, SSR server, Playwright end-to-end tests
DEPLOYMENT.md  Cloud Run deployment notes and load-testing guidance
```

The backend and frontend are separate services. In production, the browser sends API requests to the frontend's `/api` path; the frontend SSR server forwards those requests to the backend. This keeps the API on the same browser origin and supports the admin authentication cookie.

## Requirements

- Node.js 24 and npm
- MongoDB (local or MongoDB Atlas)
- Cloudinary credentials for uploading product photos and videos

Install backend and frontend dependencies independently:

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

## Local development

### 1. Configure the backend

Create a local environment file from the example:

```bash
cd backend
cp .env.example .env
```

Set the values in `backend/.env`:

| Variable                | Required          | Description                                                                                                   |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `PORT`                  | No                | API port; defaults to `5000`.                                                                                 |
| `FRONTEND_ORIGIN`       | Yes               | Exact frontend origin allowed by CORS, such as `http://localhost:4200`.                                       |
| `MONGO_URI`             | Yes               | MongoDB connection string.                                                                                    |
| `MONGO_MAX_POOL_SIZE`   | No                | Maximum MongoDB connections per API instance; defaults to `20`.                                               |
| `MONGO_DNS_SERVERS`     | No                | Comma-separated DNS server IPs. Leave unset unless the local DNS resolver cannot resolve MongoDB SRV records. |
| `JWT_SECRET`            | Yes               | Secret used to sign admin session tokens. Use a long, randomly generated value.                               |
| `JWT_EXPIRE_SECONDS`    | No                | Admin session lifetime in seconds; defaults to `7200`.                                                        |
| `ADMIN_USERNAME`        | Yes               | Admin login name.                                                                                             |
| `ADMIN_PASSWORD_HASH`   | Yes               | Bcrypt hash of the admin password; never put a plain password here.                                           |
| `CLOUDINARY_CLOUD_NAME` | For media uploads | Cloudinary cloud name.                                                                                        |
| `CLOUDINARY_API_KEY`    | For media uploads | Cloudinary API key.                                                                                           |
| `CLOUDINARY_API_SECRET` | For media uploads | Cloudinary API secret.                                                                                        |

Keep `.env` files and production secrets out of Git. For production, store secrets in the hosting provider's secret manager. Configure all three Cloudinary variables before uploading media. Product uploads accept up to three images or one video; each uploaded file is limited to 25 MB.

Start the API in one terminal:

```bash
cd backend
npm run dev
```

The API connects to MongoDB before it starts listening. Check `http://localhost:5000/api/health` for liveness and `http://localhost:5000/api/ready` for database readiness.

### 2. Start the frontend

In another terminal:

```bash
cd frontend
npm start
```

Open `http://localhost:4200`. The development frontend uses `http://localhost:5000/api` for API requests. The backend's `FRONTEND_ORIGIN` must match `http://localhost:4200` so credentialed requests work.

## Main API routes
## Live Deployment (Render)

The application is deployed on [Render](https://render.com/) as two separate services.

| Service | URL | Description |
|---|---|---|
| Frontend — Al Rayan Palace UI | https://al-rayan-palace-ui.onrender.com | Public storefront (Angular 22 with SSR). |
| Backend — Al Rayan Palace API | https://al-rayan-palace.onrender.com | Express REST API connected to MongoDB. |

### Service Health Checks

- **Backend readiness:** https://al-rayan-palace.onrender.com/api/ready
- **Frontend API proxy readiness:** https://al-rayan-palace-ui.onrender.com/api/ready

Both endpoints should return HTTP `200 OK` when the backend and database are available.

### Deployment Architecture

- The Angular frontend is hosted as a separate Render Web Service.
- The Express backend is hosted as a separate Render Web Service.
- The frontend forwards `/api` requests to the backend through its server-side proxy.
- The browser communicates with the API through the frontend's origin, preserving the admin authentication cookie.

### Hosting Notes

Both services currently use Render's Free instance tier. Free services may spin down after inactivity, causing a delay when the first request arrives.


- `GET /api/health` — process liveness.
- `GET /api/ready` — readiness, including MongoDB connection state.
- `GET /api/products` and `GET /api/products/:id` — public catalog and product details.
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` — admin session endpoints.
- `/api/admin/products` — authenticated product management and media uploads.
- `GET /api/sitemap.xml` — product sitemap generated from MongoDB.

The admin login uses an HTTP-only cookie. Production cookies require HTTPS. Keep the frontend and backend origins configured correctly so the cookie and credentialed requests work as intended.

## Checks and tests

Run backend tests and compile the API:

```bash
cd backend
npm test
npm run build
```

Run frontend unit tests and create a production build:

```bash
cd frontend
npm test
npm run build
```

Install the Playwright browser once, then run frontend end-to-end tests:

```bash
cd frontend
npm exec playwright install chromium
npm run test:e2e
```

Playwright starts the Angular development server automatically and mocks API responses; the E2E suite does not require the backend or a database. `npm run test:e2e:ui` opens the Playwright UI.

## Production deployment

Deploy `backend/` and `frontend/` as separate services from their Dockerfiles. Both containers use Node.js 24 and listen on the `PORT` provided by the hosting platform.

Configure the backend with:

- `FRONTEND_ORIGIN` set to the public HTTPS frontend origin.
- `MONGO_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH`.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` for media uploads.
- `MONGO_MAX_POOL_SIZE` appropriate for the database tier and number of API instances.

Configure the frontend SSR service with:

- `API_ORIGIN` set to the backend service origin, without `/api` or a trailing slash.
- `PUBLIC_SITE_URL` set to the canonical public HTTPS storefront URL.

The frontend serves `robots.txt`, forwards `/api` traffic to the backend, and proxies `/sitemap.xml` to the backend sitemap route. Set the hosting readiness probe to `/api/ready` on the backend and its liveness probe to `/api/health`.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Cloud Run deployment details and the load-test gate. The project has not been proven to support 10,000 simultaneous users by the presence of autoscaling configuration alone. Validate gradually under representative traffic and monitor p95/p99 latency, errors, instance count, resource use, and MongoDB connections before setting production scaling limits.

## Important data safety note

`backend/src/seed.ts` currently calls `deleteMany({})` before inserting its sample data, and the sample list is empty. **Do not run `npm run seed` against a database containing data you need to keep.**

## Security and operations

- Never commit `.env`, passwords, JWT secrets, or Cloudinary API secrets.
- Use HTTPS in production and restrict MongoDB network access to trusted services.
- Back up MongoDB and test restoring a backup before relying on production data.
- Use `/api/ready` for readiness checks; an API process without MongoDB is not ready to serve product requests.
- Set autoscaling and connection-pool limits together so the combined maximum connections from all backend instances stay within the MongoDB plan's capacity.
