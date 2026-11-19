# Google Cloud Run deployment

Deploy `backend/` and `frontend/` as separate Cloud Run services from their respective Dockerfiles.

## Backend service

Configure these environment variables or Secret Manager references:

- `FRONTEND_ORIGIN`: the deployed frontend service URL or its custom domain.
- `MONGO_URI`: MongoDB connection string.
- `MONGO_MAX_POOL_SIZE`: per-instance MongoDB pool ceiling; start at 20 and tune against the MongoDB plan and Cloud Run maximum instances.
- `MONGO_DNS_SERVERS`: optional comma-separated DNS IPs. Leave unset on Cloud Run unless its resolver fails; for the reported local Node DNS issue, use `1.1.1.1` in the untracked local `.env` only.
- `JWT_SECRET`: a long random secret.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`: admin credentials; do not use a plain password.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

The service listens on Cloud Run's `PORT`. Configure the startup/readiness probe to use `/api/ready` and liveness to use `/api/health`.

## Frontend SSR service

Set `API_ORIGIN` to the backend Cloud Run service origin, without a trailing slash or `/api` suffix. The SSR process calls `${API_ORIGIN}/api`; browser API requests are proxied through the frontend service to the backend, avoiding browser CORS and cookie domain mismatches.

Set `PUBLIC_SITE_URL` to the canonical HTTPS frontend domain. The frontend serves `robots.txt` with a sitemap reference and proxies `/sitemap.xml` to the backend's streaming product sitemap endpoint.

Build and deploy each directory independently with Cloud Build or `gcloud run deploy --source`. Set a minimum instance count and maximum instance count only after load testing with the chosen MongoDB connection limits. Configure the frontend custom domain and HTTPS after both services are healthy.

## Load test gate

Test at gradually increasing concurrency up to 10,000 simultaneous sessions. Record requests per second, p50/p95/p99 latency, 5xx rates, Cloud Run instance count, memory, CPU, and MongoDB connection usage. Do not set production autoscaling limits from the target session count alone; tune them from the measured request rate and database capacity.
