# Alrayan Palace — Project Engineering & Security Standard

- **Document type:** Project-specific engineering standard
- **Version:** 1.0.0
- **Status:** Mandatory for new code; incremental remediation standard for existing code
- **Last reviewed:** 2026-11-20
- **Scope:** Alrayan Palace storefront and its Node.js/TypeScript backend
- **Primary goals:** Secure product catalogue, reliable administration, safe media handling, data integrity, maintainability, and production readiness

> This document is specific to Alrayan Palace. Keep the separate, general `MY_NODEJS_TYPESCRIPT_ENGINEERING_STANDARD.md` as the reusable standard for future projects. When a general rule conflicts with an explicit project decision here, this project document governs this repository unless an approved Architecture Decision Record (ADR) changes the decision.

---

## 0. Scope, Normative Language, and Adoption

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative:

- **MUST / MUST NOT:** mandatory for new code and for code materially changed by a task.
- **SHOULD / SHOULD NOT:** expected by default. A deviation requires a documented reason and review.
- **MAY:** optional and context-dependent.

### 0.1 What this standard covers

This standard covers:

- The Express 5 + TypeScript backend.
- The Angular storefront/admin frontend where it interacts with backend security or API contracts.
- MongoDB Atlas and Mongoose persistence.
- JWT-based administrator authentication using an HttpOnly cookie.
- Product metadata and image/video media uploaded to Cloudinary.
- Local, test, staging, and production configuration.
- Tests, dependency management, deployment, logging, and operational behavior.

It does **not** define a payment, checkout, customer-account, order-management, or inventory-reservation system. Those features MUST NOT be added implicitly. Any future payment or customer-identity feature requires a separate threat model, API contract, and ADR.

### 0.2 New code versus legacy code

- New code MUST follow this standard.
- A bug fix MUST bring the changed behavior into compliance where practical.
- Existing code MUST be assessed incrementally; do not perform a broad, risky rewrite merely to make folder names match this document.
- Record an existing violation as a tracked remediation item, with severity, impact, compensating control, and owner.
- Do not label the backend Production-Ready while a blocking security, data-integrity, or operational issue remains open.

### 0.3 Project acceptance principle

A feature is complete only when its observable behavior, security boundary, failure behavior, tests, configuration, and operational impact have been reviewed. “It works in the browser” is not a sufficient acceptance criterion.

---

## 1. Project Context and Fixed Decisions

### 1.1 Product purpose

Alrayan Palace is a product-showcase storefront. The public experience displays product details and image/video media. An administrator manages catalogue entries through a protected dashboard.

The backend is responsible for:

- Public product and category reads.
- Administrator login, session cookie, and authentication status.
- Administrator-only product listing, creation, update, and deletion.
- Product metadata persistence in MongoDB.
- Uploading and deleting media through Cloudinary.
- Health/readiness and sitemap endpoints.

The backend is **not** responsible for trusting the Angular UI to enforce access control. All authorization and validation MUST be enforced server-side.

### 1.2 Current technology baseline

The repository has been observed using the following stack. The lockfile is authoritative for exact installed patch versions; review the lockfile before dependency upgrades.

| Area | Current project choice | Project rule |
|---|---|---|
| Runtime | Node.js 24.x was previously reported in the local development environment | Confirm with `node -v`; pin the selected supported patch/major using `.nvmrc` and `engines` before release |
| Language | TypeScript 6.x | Keep strict checking enabled; compile the production backend |
| Module system | ESM (`"type": "module"`) | Preserve ESM and `.js` extensions in relative TypeScript imports when using NodeNext resolution |
| Package manager | npm | Keep npm; commit `package-lock.json`; use `npm ci` in CI and clean deployments |
| HTTP server | Express 5 | Use Express 5 semantics; do not copy Express 4 behavior without compatibility review |
| Database | MongoDB Atlas | Use a separate least-privilege database user for each environment |
| ODM | Mongoose 9.x | Retain Mongoose; follow the Mongoose-specific rules in Section 10 |
| Authentication | `jsonwebtoken` + `bcrypt` | Keep algorithm policy explicit; keep credentials in server-side configuration only |
| Cookies | `cookie-parser` + HttpOnly JWT cookie | Cookie attributes and CSRF checks MUST remain aligned |
| Upload parsing | Multer 2.x, memory storage | Enforce strict size/count limits and bound concurrent upload memory |
| Media storage | Cloudinary | Use separate test and production credentials/accounts or isolated environments |
| Security middleware | Helmet, CORS, express-rate-limit | Configure by environment and known proxy topology |
| File identification | `file-type` | Magic-byte detection is a type check, not a malware scan or full file-integrity guarantee |
| Tests | Node.js `node:test` via `tsx --test` | Keep the existing runner unless a deliberate ADR approves migration |
| Frontend | Angular 22-era application with SSR configured | Preserve API contracts and request-scoped authentication behavior across SSR |

Do not assume a version listed above is the latest available version. Dependency upgrades MUST be deliberate, lockfile-backed, tested, and reviewed against the project's runtime.

### 1.3 Architectural decisions already in use

The following are accepted project decisions unless superseded by an ADR:

1. The backend uses Mongoose rather than replacing it with the native MongoDB driver.
2. npm is the package manager.
3. The backend is ESM TypeScript and Express 5.
4. The administrator identity is configured server-side; the client does not choose its role.
5. The administrator JWT is delivered in an HttpOnly cookie, not localStorage.
6. Product media bytes are stored in Cloudinary; MongoDB stores product metadata and media references.
7. Public catalogue access is read-oriented; product mutations are administrator-only.
8. Local/test data and credentials MUST be separated from production data and credentials.

A change to any of these decisions requires an ADR describing the context, alternatives, risks, migration, and rollback/forward-fix strategy.

---

## 2. Required Engineering Workflow

For significant changes, perform these stages sequentially.

### 2.1 [PLANNER — SENIOR]

Before implementation:

- State the requirement and observable acceptance criteria.
- Inspect the current implementation and callers; do not design from filenames alone.
- Identify routes, middleware, controllers, services, models, environment variables, and frontend consumers affected.
- Define data ownership, request flow, authorization boundary, side effects, and failure handling.
- Identify whether the change touches MongoDB, Cloudinary, cookies, CORS, CSRF, SSR, or public API contracts.
- Identify how the change will be tested without production services or production data.
- Separate the requested fix from optional refactoring.

### 2.2 [PROGRAMMER — SENIOR]

- Make small, cohesive changes.
- Keep validation at the trust boundary and do not trust client-side checks.
- Keep external side effects explicit and compensate for partial failures where possible.
- Preserve existing API behavior unless a breaking change is intentional and documented.
- Avoid adding a dependency if Node.js or an existing approved package is adequate.
- Do not use broad `any`, unsafe double casts, `@ts-ignore`, or unexplained non-null assertions to silence TypeScript.
- Do not commit temporary logs, secrets, test bypasses, or commented-out obsolete code.

### 2.3 [TESTER]

- Add a regression test for every bug fix.
- Test expected success, malformed input, unauthorized access, dependency failure, and cleanup behavior as applicable.
- Unit-test pure helpers and integration-test HTTP, database, file, and provider boundaries.
- Use synthetic data and isolated test resources.
- Run only the commands actually available in `package.json`; report checks that are not configured rather than pretending they passed.
- Never use production MongoDB or production Cloudinary resources in automated tests.

### 2.4 [CRITIC]

Review:

- Correctness and API compatibility.
- Validation and authorization at every relevant route.
- Cookie, JWT, CORS, and CSRF behavior.
- Mongoose query safety, index use, and data consistency.
- Cloudinary side effects and cleanup.
- Memory use, concurrency, timeouts, and retry behavior.
- Error-response redaction and safe logging.
- Tests, build, audit, configuration, and rollback implications.

Conclude with **APPROVED** or **REVISED ACTION ITEMS**. A local test pass is not proof of production readiness.

---

## 3. Project Architecture and Module Ownership

### 3.1 Existing layout is the starting point

The backend currently uses a structure similar to:

```text
backend/
├── src/
│   ├── config/          # env, database, Cloudinary configuration
│   ├── controller/      # HTTP handlers and current product operations
│   ├── middleware/      # authentication, upload, origin validation
│   ├── models/          # Mongoose models and schemas
│   ├── routes/          # Express route registration
│   ├── services/        # authentication and Cloudinary integrations
│   ├── types/           # Express request augmentation
│   ├── seed.ts
│   └── server.ts
├── package.json
├── package-lock.json
└── .env.example
```

Do not move every file merely to match a reference architecture. Preserve the established folders during focused fixes.

### 3.2 Target responsibility boundaries

The intended direction for future work is:

```text
Express Router
  → HTTP middleware (origin, authentication, authorization, limits)
  → Controller (HTTP input/output mapping)
  → Application/service function (use-case orchestration)
  → Mongoose model/repository boundary
  → MongoDB Atlas

Application/service function
  → Cloudinary adapter (external media side effect)
```

Ownership rules:

| Component | Owns | Must not own |
|---|---|---|
| Router | HTTP method/path and middleware order | Database queries or product business rules |
| Middleware | Cross-cutting HTTP policy: authentication, trusted origin, upload parsing/validation, rate limit | Product persistence or unrelated business decisions |
| Controller | Request parsing, calling a use case, status and response DTO | Large workflows, duplicated validation, raw configuration loading |
| Service/use case | Product workflow and external-side-effect orchestration | Express `Request`/`Response` objects |
| Mongoose model/schema | Document shape, schema-level validation, persistence lifecycle | HTTP response decisions or authorization policy by itself |
| Cloudinary service | Cloudinary SDK interaction, upload/delete mapping | HTTP status codes or direct request parsing |
| Config module | Parse, validate, and export immutable configuration | Repeated ad hoc reads of `process.env` across the application |

### 3.3 Incremental architecture rules

- Controllers currently containing Mongoose queries MAY remain temporarily, but new complex workflows SHOULD move to focused service functions.
- Do not introduce repositories, interfaces, factories, or dependency-injection frameworks without a concrete testing or boundary benefit.
- A controller MUST NOT pass raw `req.body`, `req.query`, or `req.params` directly into MongoDB.
- A service MUST NOT receive Express `req` or `res`.
- Cloudinary calls MUST remain behind the Cloudinary service/adapter.
- Do not import a controller from another feature.
- Avoid circular imports and import-time I/O.
- The application composition and process startup SHOULD be separated into `app.ts` and `server.ts` when HTTP integration testing or lifecycle complexity justifies it. Do not perform this split as an unrelated cosmetic rewrite.

### 3.4 Frontend/backend boundary

- Angular is an untrusted client. Its route guards and UI visibility are usability features, not security controls.
- All product mutation permissions MUST be enforced in Express.
- Frontend and backend MUST agree on request/response DTOs, status codes, pagination, error payloads, cookie credentials, and media limits.
- Do not expose MongoDB documents, Cloudinary secrets, JWT secrets, bcrypt hashes, or internal provider details to Angular.
- Angular SSR MUST NOT store one user's cookies or authentication state in shared process/module state. Any server-side cookie forwarding MUST be request-scoped and allow-listed.
- Browser API calls that rely on the admin cookie MUST use credentialed requests (`withCredentials: true`) and an explicit API origin.
- Frontend environment files and browser bundles MUST contain public configuration only, never API keys or backend secrets.

---

## 4. Runtime, TypeScript, and Package Management

### 4.1 Runtime policy

- Confirm the actual backend runtime with `node -v` before pinning it.
- Pin the chosen supported Node.js major/patch in `.nvmrc` and declare a compatible range in `package.json` `engines`.
- New deployments MUST use a supported Node.js release; do not deploy an end-of-life runtime.
- Keep local, CI, test, and production Node.js versions aligned.
- Do not upgrade Node.js, TypeScript, Express, Mongoose, or Multer as part of an unrelated bug fix.

### 4.2 TypeScript policy

- `strict` MUST be enabled.
- Use `unknown` for untrusted values and narrow them using validation or type guards.
- Do not cast external request data into trusted types without runtime validation.
- Prefer discriminated unions for state and result types.
- Use `import type` for type-only imports.
- Keep ESM imports consistent with the repository's NodeNext configuration; relative TypeScript imports SHOULD use `.js` extensions where required by the configured resolver.
- Do not suppress compiler errors globally.
- Add `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`, and `noUnusedParameters` when the existing code has been assessed and can adopt them without an uncontrolled migration. Do not disable `strict` to make old code compile.

### 4.3 npm and dependencies

- npm is the project's package manager. Do not introduce pnpm or yarn into this repository without an ADR.
- Commit `package-lock.json` and use `npm ci` for clean CI/deployment installs.
- Do not commit `node_modules`, `dist`, coverage output, `.env`, or local secret files.
- Review every dependency for maintenance, license, transitive dependencies, install scripts, Node compatibility, and security history.
- Run `npm audit` and investigate all findings; `found 0 vulnerabilities` means no known advisories were reported by that audit at that time, not that the application is secure.
- Do not use `npm audit fix --force` without reviewing major-version effects.
- Review `allowScripts` changes deliberately. Approve only packages whose install scripts are needed and understood.
- Prefer built-in Node.js capabilities for small helpers.
- Review whether legacy type packages are needed when a library ships its own TypeScript definitions (for example, verify whether `@types/mongoose` is redundant before removing it).

### 4.4 Required quality scripts

Maintain scripts for:

- `npm test` — unit and integration suites.
- `npm run build` — production TypeScript build.
- `npm run format:check` — Prettier verification.
- `npm audit` — dependency advisory check.

The project SHOULD add explicit `typecheck` (`tsc --noEmit`) and `lint` scripts. Do not claim linting or no-emit type checking passed until those scripts are configured and run.

---

## 5. Configuration and Secrets

### 5.1 Configuration loading

- Read `process.env` in the configuration module only; other modules consume the typed exported config.
- Validate required variables at startup and fail fast with a safe message naming the missing/invalid key, never its value.
- Validate numbers as finite integers within explicit ranges (port, pool size, rate limits, JWT duration, upload limits).
- Validate URL-valued configuration using the URL parser and enforce allowed schemes.
- Freeze or expose configuration as immutable/read-only data.
- Do not silently default required production secrets or external-service credentials.
- Keep development, test, staging, and production configuration separate.

### 5.2 Known project configuration keys

The current backend has used keys such as:

| Key | Purpose | Rule |
|---|---|---|
| `PORT` | Backend listener | Integer in the valid TCP port range |
| `NODE_ENV` | Runtime mode | Explicitly one of development, test, production |
| `FRONTEND_ORIGIN` | CORS and trusted browser origin | One exact origin; validate scheme/host/port; no path or wildcard |
| `MONGO_URI` | MongoDB connection | Secret; never log or expose |
| `MONGO_MAX_POOL_SIZE` | Mongoose/MongoDB pool sizing | Positive bounded integer based on deployment capacity |
| `MONGO_DNS_SERVERS` | Optional DNS override | Local/exceptional use only; document why; do not use as a permanent substitute for correct DNS/network configuration |
| `JWT_SECRET` | HS256 signing secret | High-entropy secret; unique per environment; rotate if exposed |
| `JWT_EXPIRE_SECONDS` | Access-token lifetime | Positive bounded integer; keep short enough for the admin risk profile |
| `ADMIN_USERNAME` | Configured administrator identity | Do not log or expose configuration wholesale |
| `ADMIN_PASSWORD_HASH` | bcrypt password hash | Never expose to API responses or logs |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account identifier | Backend configuration only |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Secret; backend only |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Secret; backend only |

`.env.example` MUST contain placeholders only. `.env` MUST be ignored by Git. Never paste actual values into tickets, commits, documentation, screenshots, or AI prompts.

### 5.3 Secret handling and rotation

- Use a secret manager in production where available.
- Use separate MongoDB users, JWT secrets, and Cloudinary credentials for local/test/staging/production.
- The test database user MUST have access only to the test database and only the permissions required by tests.
- If a real credential is exposed in source control, terminal logs, screenshots, chat, or an issue, treat it as compromised and rotate it.
- Never put Cloudinary credentials, MongoDB credentials, JWT secrets, or administrator password hashes in Angular configuration or browser bundles.
- Do not log complete configuration objects.

---

## 6. Express HTTP, CORS, CSRF, and Middleware Order

### 6.1 Middleware order

The backend MUST keep middleware order deliberate. Separate application-wide middleware from route-specific security chains.

Application-wide order:

1. Trusted proxy configuration based on the real deployment topology.
2. Helmet/security headers.
3. CORS with the exact configured frontend origin and credentials policy.
4. Global/route-specific rate limits at the appropriate boundary.
5. Body parsing with an explicit size limit.
6. Cookie parsing.
7. Route registration, followed by not-found and centralized error handlers (the error handler last when the app is composed separately).

Route-specific order:

- Login/logout routes: trusted-origin validation MUST run before credential processing or the logout side effect; login rate limiting MUST also run before password verification.
- Admin routes: rate limit → authenticate administrator → authorize the operation → validate trusted Origin/CSRF → Multer parsing → file-signature validation → controller/service.
- All authentication, authorization, and origin checks MUST occur before upload parsing or external side effects on protected media routes.

Do not put business logic in middleware. Do not process file bytes before authentication and authorization on protected upload routes.

### 6.2 CORS

- Configure an explicit origin allow-list using `FRONTEND_ORIGIN` or a validated list of known frontend origins.
- Never combine credentialed requests with `Access-Control-Allow-Origin: *`.
- Do not reflect arbitrary `Origin` values.
- Allow only required methods and headers.
- Keep CORS and CSRF as separate controls. **CORS is not CSRF protection.**
- A denied CORS origin is not necessarily a server-side authorization denial; the server MUST independently enforce origin/session policy where required.

### 6.3 CSRF policy

For cookie-authenticated state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`):

- Validate the exact expected origin against the configured frontend origin.
- Reject opaque `Origin: null` values.
- If `Origin` is absent, a carefully parsed `Referer` MAY be used as a fallback, and its origin MUST match exactly.
- Reject requests when neither a verifiable Origin nor acceptable Referer is present, unless the route uses a separately designed non-browser authentication mechanism.
- Apply this policy to every cookie-authenticated state-changing route, not only the currently existing admin product routes.
- Safe methods (`GET`, `HEAD`, `OPTIONS`) MUST NOT change application state.
- SameSite is defense in depth, not the only CSRF control.
- Use `SameSite=None` only when cross-site cookie delivery is genuinely required; it MUST be paired with `Secure`.
- If production frontend/backend are cross-site, evaluate a synchronizer token or signed double-submit token in addition to exact Origin validation, based on the deployment threat model.
- Test allowed and denied requests using a valid authenticated cookie.

The current `requireTrustedOrigin` middleware and its tests are a baseline control. Any new state-changing route MUST be reviewed to ensure the middleware is in its chain.

### 6.4 Rate limiting

Current limits observed in the application (10 login attempts per 15 minutes, public API 300 requests per minute, admin API 120 requests per minute, media upload 10 requests per minute) are starting values, not universal guarantees.

- Document the purpose and expected traffic for each limiter.
- Apply stricter limits to login and other abuse-prone operations.
- Ensure `req.ip` is trustworthy by configuring `trust proxy` only for the known reverse-proxy topology.
- Do not blindly use `app.set('trust proxy', 1)` in a deployment with a different proxy chain.
- Use a shared store if multiple backend instances must enforce a global limit; the default in-memory store is per process.
- Return `429` and a useful `Retry-After` header where appropriate.
- Test limiter behavior and proxy/IP behavior.

### 6.5 HTTP behavior

- `GET` endpoints MUST be read-only.
- Use `400` for invalid request syntax/validation, `401` for missing/invalid authentication, `403` for an authenticated/verified request that is forbidden, `404` for missing resources, `409` for conflicts, `429` for rate limits, and `500` for unexpected failures.
- Return `204` without a response body.
- Bound JSON request size (currently 1 MB unless a route has a documented requirement).
- Set cache policy deliberately. Authenticated admin responses SHOULD use `Cache-Control: no-store`.
- Do not expose stack traces, database errors, filesystem paths, provider diagnostics, or secrets.
- Keep response DTOs stable and document breaking changes.

---

## 7. Administrator Authentication, JWT, Cookies, and Authorization

### 7.1 Administrator identity

- Administrator credentials are configured on the backend; the browser MUST NOT be allowed to choose or submit a role.
- Verify the submitted password using `bcrypt.compare` (or the explicitly adopted password-hash verifier); never compare a password to a stored hash as plain text.
- Use a generic invalid-credentials response for unknown username and wrong password.
- Rate-limit login attempts.
- Never return `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, or token contents in API responses.
- Admin username/password configuration MUST be validated at startup.
- Do not add a public admin-registration endpoint.

### 7.2 JWT policy

The current project uses a symmetric HMAC JWT flow. Therefore:

- Explicitly allow only the configured algorithm (currently intended to be `HS256`) when signing and verifying.
- Do not accept `none` or a different algorithm.
- Require a valid signature and expiration (`exp`).
- Add and validate issuer (`iss`) and audience (`aud`) claims as a tracked hardening task before production deployment.
- Validate subject (`sub`) and role claims with runtime checks; role must be exactly the expected administrator role.
- Do not place secrets or sensitive personal data in token claims.
- Keep token lifetime bounded and documented.
- Use a high-entropy `JWT_SECRET` unique to each environment; define a safe rotation procedure.
- Do not implement JWKS for the current symmetric local/admin token unless the system moves to asymmetric signing and a trusted issuer. JWKS is relevant to appropriate asymmetric-key deployments, not a requirement for every HS256 token.

### 7.3 Cookie policy

- Admin auth cookies MUST be `HttpOnly`.
- Production cookies MUST use `Secure` and HTTPS.
- Select `SameSite=Lax` or `Strict` where the frontend/backend deployment allows it. Use `SameSite=None` only for a documented cross-site requirement and always with `Secure`.
- Keep `Path=/` unless a narrower path is compatible with all required routes.
- Omit `Domain` unless there is a reviewed requirement to share the cookie across subdomains.
- Cookie creation and clearing MUST use matching `Path`, `Domain` (if any), `Secure`, and `SameSite` attributes.
- Centralize cookie options so login and logout cannot drift.
- Consider the `__Host-` prefix only when its Secure, Path, and no-Domain requirements are compatible with local development and deployment.
- Do not store the JWT in localStorage or expose it to Angular JavaScript.

### 7.4 Logout and token revocation

The current logout implementation clears the browser cookie. This does not cryptographically revoke a copied stateless JWT. A copied token may remain valid until expiration.

- Do not document cookie deletion as immediate server-side token revocation.
- Keep access-token lifetime appropriately short.
- If immediate revocation is required, introduce server-side session state, a token-version check, or a bounded denylist with an explicit expiry policy.
- Revisit revocation when adding multiple administrators, password changes, account disablement, or role changes.

### 7.5 Authorization

- Protect every admin operation at the server.
- Apply `requireAdmin` before admin controllers and before Multer processing.
- UI route guards are not authorization.
- Do not trust a client-supplied role, username, owner ID, or admin flag.
- Any future multi-user or multi-tenant feature MUST add per-resource authorization/ownership checks; a generic `role === 'admin'` check will not be enough for user-owned data.
- Test unauthenticated, malformed-token, expired-token, and authorized requests.

---

## 8. Product Domain and API Rules

### 8.1 Product shape and validation

The current product behavior includes fields such as:

- `title` (required; maximum 120 characters).
- `category` (required; maximum 80 characters).
- `description` (optional; maximum 1000 characters).
- `mediaUrl` and `mediaType` (`image` or `video`).
- `mediaPublicId` and optional image `gallery` references.
- `featured` (boolean).
- Optional `instagramUrl`.
- `createdAt` and `updatedAt`.

Rules:

- Maintain one canonical schema/validation rule for each invariant; do not let frontend validation and backend validation drift.
- Parse/validate request bodies at the boundary. Do not cast `req.body` to a product type.
- Whitelist fields accepted by create and update operations. Never spread all of `req.body` into a Mongoose document.
- Keep title/category/description limits consistent across create, update, and frontend forms.
- Parse booleans explicitly; do not treat arbitrary strings as `true`.
- Validate ObjectId path parameters before queries.
- Do not allow clients to set `mediaPublicId`, timestamps, internal fields, or persistence metadata.
- Update behavior for omitted fields MUST be documented and tested.
- Preserve or clear the gallery deliberately when changing between image and video media.

### 8.2 Instagram references

- Accept only HTTPS URLs whose hostname is exactly `instagram.com` or `www.instagram.com`.
- Reject URL username/password credentials and malformed/overlong values.
- Do not use the supplied Instagram URL as a server-side fetch target. If future functionality fetches remote URLs, it requires a separate SSRF-safe design.
- Keep optional/blank behavior explicit and tested.

### 8.3 Public product API

- Public catalogue routes are read-only unless a separately approved feature changes this.
- Public response DTOs MUST expose only fields needed by the storefront.
- Public reads MUST NOT expose Cloudinary API credentials, internal error details, admin-only fields, or raw Mongoose metadata.
- Bound pagination, search length, result count, and category/filter values.
- Escape search input before building regular expressions; bound the input length and review regex complexity.
- Whitelist filter fields and allowed values. Do not pass arbitrary query objects into Mongoose.
- Use deterministic sort order; include a stable tie-breaker when pagination correctness requires it.
- Review indexes for public product/category queries using representative data and `explain()`.
- The sitemap MUST use a validated public site origin and safely encode product URLs. Do not treat request Host headers as trusted canonical origins.

### 8.4 Admin product API

- All admin product routes MUST be behind the administrator authentication middleware.
- All state-changing admin routes MUST also pass trusted-origin/CSRF validation.
- Upload limits MUST apply before controller execution.
- Return stable status codes and response DTOs.
- Delete operations MUST define what happens if MongoDB deletion succeeds but Cloudinary deletion fails; log and reconcile the orphaned asset rather than returning a misleading rollback claim.

---

## 9. Media Upload and Cloudinary

### 9.1 Allowed media and limits

The current intended policy is:

- Up to three images per product, or one video.
- Maximum file size: 25 MB per file.
- Current allow-list includes JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, and QuickTime.

Rules:

- Keep the allow-list centralized and consistent across Multer, magic-byte validation, tests, UI, and Cloudinary resource-type mapping.
- Do not trust the extension or client-supplied `file.mimetype`.
- Check actual file signatures (magic bytes) and require the detected type to match the declared allowed MIME type.
- Add a valid binary fixture and test for every supported format before claiming support. A format present in the allow-list but not recognized by the detector MUST be rejected or explicitly supported through a reviewed fallback.
- Magic-byte detection is best-effort type identification. It does not prove a complete, non-corrupt, benign file and is not an antivirus scan.
- Consider image re-encoding or media inspection in an isolated/bounded worker if the threat model requires stronger assurance.
- Reject empty, unrecognized, mismatched, and unsupported files before Cloudinary upload.
- Never use the original filename as a filesystem path or trusted Cloudinary public ID.

### 9.2 Middleware order for uploads

Admin media routes MUST follow this logical sequence:

```text
Rate limit
  → authenticate administrator
  → validate trusted Origin / CSRF
  → Multer file count and byte-size limits
  → magic-byte/content-type validation
  → controller/service validation
  → Cloudinary upload
  → MongoDB save
```

Do not call Cloudinary from Multer's file filter. Do not begin external upload before authentication and content validation complete.

### 9.3 Memory and concurrency

The current design uses Multer `memoryStorage()`. Three 25 MB files can require approximately 75 MB of raw file buffers for one request, excluding JavaScript objects, parsing overhead, Cloudinary buffers, and concurrent requests.

- Keep per-file size and file-count limits.
- Bound concurrent upload requests at the application or edge layer based on measured memory capacity.
- Do not increase upload limits without a memory/concurrency review.
- Consider streaming or temporary-disk/object-storage staging if upload size or traffic grows.
- Ensure buffers are released when the request completes or fails.
- Do not run CPU-heavy image/video transformations on the Express event loop.

### 9.4 Cloudinary integration

- Keep all Cloudinary SDK calls inside the Cloudinary adapter/service.
- Validate Cloudinary environment variables at startup when uploads are enabled; fail with safe messages that identify missing key names, never values.
- Use a dedicated Cloudinary test account or isolated test environment. Never run test uploads/deletes against production assets.
- Use a stable folder/prefix for the project and separate test/production namespaces.
- Store only `publicId`, secure URL, and required media type metadata in MongoDB.
- Use HTTPS secure URLs.
- Do not trust a client-supplied Cloudinary public ID for deletion.
- Delete old assets only after the database successfully references the replacement.
- If database save fails after a successful upload, attempt cleanup of newly created assets and log cleanup failures.
- If cleanup fails, treat it as an orphaned asset requiring reconciliation; do not hide the original failure.
- If database outcome is ambiguous due to a connection failure during write, do not assume rollback occurred. Design idempotent reconciliation for externally created assets.
- Use bounded timeouts and provider error classification where supported.

### 9.5 Test policy for media

- Unit tests MUST cover valid signatures, mismatched MIME, corrupt/empty content, and unsupported types.
- Integration tests MUST verify Multer → validator → handler ordering and prove rejected content never reaches the upload service.
- Cloudinary behavior MUST be tested with a local stub/mock or a dedicated test account. Tests that require live Cloudinary MUST be explicitly marked and never run against production credentials.
- Do not call a flow “end-to-end tested” while Cloudinary or the real test database portion has been skipped.

---

## 10. MongoDB Atlas and Mongoose Rules

### 10.1 Environment separation and database users

- Use separate databases for development/test/staging/production.
- Use separate database users per environment, with only the roles required for that environment.
- The test account MUST NOT have `atlasAdmin`, `readWriteAnyDatabase`, or production database access.
- Restrict Atlas network access to trusted networks and application egress paths. Do not leave broad public access enabled without an explicit temporary exception and expiry.
- Never log `MONGO_URI` or expose it to the frontend.

### 10.2 Mongoose connection lifecycle

- Create one application-level Mongoose connection per process.
- Connect during startup and fail readiness/startup safely if the required database is unavailable.
- Do not connect/disconnect per request.
- Configure pool size, server-selection timeout, connect timeout, socket timeout, and retry behavior deliberately.
- Size the pool against Atlas limits and deployment instance count, leaving operational headroom.
- Close the Mongoose connection during graceful shutdown after in-flight requests have drained.
- Do not silently start serving product/admin routes before the database is ready.
- Health and readiness endpoints MUST not reveal URI, username, password, host secrets, or full driver errors.

### 10.3 Mongoose schema and write rules

- Define required fields, type constraints, enums, maximum lengths, defaults, and timestamps in the schema.
- Application validation and schema validation MUST agree on the same invariants.
- Use `runValidators: true` on update operations where Mongoose update validators are required; understand their limitations and test the actual update path.
- Do not rely on Mongoose validation as an authorization check.
- Do not pass untrusted request objects or operators into Mongoose filters/updates.
- Build filters and update objects from explicit allow-listed fields.
- Use Mongoose query sanitization features deliberately, but do not treat them as a replacement for explicit schema validation and query construction.
- Do not allow mass assignment of privileged/internal fields.
- Use `lean()` for read-only queries when Mongoose document behavior is not required.
- Do not return raw documents when the public/admin API contract requires a DTO.
- Keep document arrays bounded; do not let product galleries grow without a maximum.

### 10.4 Query safety and performance

- Validate ObjectIds before using them in query paths.
- Whitelist filter and sort fields.
- Escape and bound search input. Never accept raw `$where`, aggregation stages, or arbitrary query operators from the client.
- Cap page size and any offset. For a small catalogue, bounded offset pagination may be acceptable; revisit cursor pagination if data volume or mutation rate grows.
- Use projections when a query does not need the full document.
- Add indexes only for measured query patterns and review them with `explain()`.
- Avoid unbounded `distinct()` or full-collection reads as catalogue size grows.
- Apply `maxTimeMS` to potentially expensive queries where appropriate.
- Do not build indexes in a hot request path.

### 10.5 Consistency and external side effects

- MongoDB and Cloudinary are separate systems; there is no single atomic transaction spanning both.
- Do not hold a MongoDB transaction open while calling Cloudinary.
- Define operation ordering and compensation explicitly.
- Use idempotency keys for create operations if duplicate submissions become a real risk.
- Use optimistic concurrency/version fields if simultaneous admin updates can overwrite each other.
- Define an orphan-media reconciliation process before production traffic/volume makes manual cleanup unreliable.

---

## 11. Authentication Data, Logging, and Error Handling

### 11.1 Error responses

- Expected validation failures return safe `400` responses with stable messages/codes.
- Missing or invalid authentication returns `401`.
- Authenticated but disallowed requests return `403` (or `404` where resource concealment is required).
- Unexpected failures return a generic `500` response.
- Never return `error.message`, stack traces, MongoDB errors, Cloudinary provider payloads, absolute paths, or connection details for unexpected failures.
- Avoid broad substring matching of arbitrary error text as a permanent error-classification strategy. Prefer typed application errors and explicit provider/ODM error mapping.
- If response headers were already sent, do not write a second response; delegate/terminate according to the Express error-handling contract.
- Do not log the same failure independently at every layer.

### 11.2 Logging

The current project uses `console.error`; this is acceptable only as a temporary baseline while structured logging is not yet adopted.

Target policy:

- Adopt Pino or another approved structured logger in a focused change.
- Include timestamp, severity, request ID, route, method, status, duration, and safe error context.
- Redact `Cookie`, `Set-Cookie`, `Authorization`, passwords, JWTs, MongoDB URIs, Cloudinary secrets, and password hashes.
- Never log request bodies for login, admin credentials, file buffers, or secret-bearing configuration.
- Do not log raw signed URLs or provider tokens if they can grant access.
- Log cleanup failures with asset identifiers only when those identifiers are safe operational metadata.
- Keep security/audit events distinguishable from ordinary diagnostics.

### 11.3 Current known error-handling remediation

The controllers have been improved to return generic internal errors and log internal details. This MUST remain true in every controller and route. The long-term target is a centralized Express error handler and typed application errors, introduced incrementally without breaking API response contracts.

---

## 12. Frontend Integration and Browser Security

- Angular route guards MUST NOT be considered authorization.
- Admin API requests MUST include credentials when using the HttpOnly cookie.
- Do not manually read the HttpOnly auth cookie from JavaScript.
- Do not store the JWT in localStorage, sessionStorage, IndexedDB, or application state.
- Ensure login, `/api/auth/me`, logout, and admin API calls use the same API base origin and credential policy.
- Handle `401` by clearing frontend admin state and returning to login; do not assume a local frontend flag means the server session is valid.
- Handle `403` as a forbidden request, not automatically as an expired session.
- Do not cache admin responses in service workers, browser caches, or shared SSR caches.
- For Angular SSR, never use a process-global mutable variable to store the current user's auth state or cookies. Forward only the required cookie for the current request and only to the configured backend origin.
- Keep CSP and other browser security headers compatible with the actual Angular deployment; do not weaken CSP with broad wildcards merely to make a feature work.
- Ensure uploaded media URLs are rendered safely and that user-controlled text is handled through Angular's normal escaping, not unsafe bypass APIs.

---

## 13. Testing Standard for This Repository

### 13.1 Existing test runner

Keep Node.js `node:test` through `tsx --test` for the current repository. Do not migrate to Vitest only because it is the default for new projects in the general standard. Any runner migration requires an ADR or an explicit engineering task.

### 13.2 Required test layers

| Layer | Project examples |
|---|---|
| Unit | URL validation, media selection, query filters, config parsing, token claim validation |
| Middleware integration | Multer and magic-byte validator, authentication, trusted-origin middleware, rate limiting |
| HTTP integration | Public products, admin CRUD, login/me/logout, error responses |
| Database integration | Mongoose schema validation, real query behavior, indexes, connection failure, update behavior |
| Provider integration | Cloudinary upload/delete using a test account or a controlled stub |
| Browser/E2E | Angular login, cookie credential flow, admin product CRUD, public catalogue display |
| Security | Unauthenticated access, invalid/expired/tampered JWT, untrusted Origin, NoSQL injection attempts, file spoofing, rate-limit behavior |

### 13.3 Test isolation

- Use synthetic product data only.
- Use `store_security_test` or another dedicated disposable database; never point test commands at the production database.
- Never use production Cloudinary credentials in tests.
- Use a unique test folder/prefix or dedicated test Cloudinary account.
- Clean up created test documents and test media after tests.
- Tests MUST be deterministic and not depend on execution order.
- Do not store test passwords, cookies, JWTs, or provider credentials in test fixtures.
- Test scripts MUST fail closed when the environment points at production resources.

### 13.4 Required security test matrix

At minimum, test:

- `GET /api/admin/products` without a cookie → `401`.
- Invalid and expired JWT → `401`.
- Valid admin JWT → authorized admin route.
- Untrusted Origin with a valid admin cookie on a state-changing route → `403`.
- Trusted Origin with valid cookie → proceeds to expected route validation/handler result.
- Login with missing/invalid credentials → safe `400`/`401` behavior.
- Login rate limit → `429` after configured threshold.
- Logout → cookie cleared; subsequent request without cookie → `401`.
- Logout does not claim server-side revocation of a copied stateless JWT unless revocation is implemented.
- Product ID malformed → `400`; missing record → `404`.
- Public endpoints do not expose admin-only fields.
- NoSQL operator objects and unexpected fields are rejected.
- Upload size and file count exceedances are rejected.
- Every supported MIME/signature pairing is tested.
- Mismatched MIME/signature and invalid content are rejected before Cloudinary upload.
- MongoDB or Cloudinary failure does not leak internal details.
- New-upload cleanup and old-media cleanup failures are recorded safely.

### 13.5 Required local verification commands

Run the checks that are configured in `package.json`:

```bash
npm test
npm run build
npm run format:check
npm audit
```

The repository SHOULD add and run:

```bash
npx tsc --noEmit
npm run lint
```

until explicit scripts are added, do not report these as completed checks. Record exact test count and whether the suite touched real MongoDB or Cloudinary.

### 13.6 Current verification snapshot

At the time this project standard was prepared, the user reported:

- 26 tests passing after adding trusted-origin middleware tests.
- `npm run build` completing successfully.
- `npm audit` reporting `found 0 vulnerabilities`.
- Manual HTTP checks: untrusted login Origin → `403`; trusted login Origin with empty body → `400`; valid admin login → `200`; `/api/auth/me` → `200`; trusted product POST without media → `400`; untrusted product POST with a valid admin cookie → `403`; logout → `200`; subsequent `/api/auth/me` without the deleted cookie → `401`.

These are a dated snapshot of the tests and manual checks reported at that time. They are not a permanent quality guarantee and are not proof of full production readiness.

---

## 14. Operational Readiness and Production Deployment

### 14.1 Startup and readiness

- Validate configuration before accepting requests.
- Connect to MongoDB before declaring the backend ready.
- Keep liveness and readiness semantics distinct.
- Health responses MUST NOT expose secrets, hostnames containing credentials, stack traces, or detailed driver/provider errors.
- Cloudinary may be an optional dependency for read-only public catalogue startup only if the application can safely serve reads without it. If admin upload is enabled but Cloudinary is not configured, readiness/capability reporting MUST make that limitation explicit and upload operations MUST fail safely.

### 14.2 Proxy, HTTPS, and server timeouts

- Configure `trust proxy` only for the actual deployment topology. Confirm how many trusted proxies exist and which headers the edge overwrites.
- Use HTTPS in production and HSTS at the trusted edge/server.
- Set request, headers, keep-alive, and outbound dependency timeouts deliberately.
- Apply request-size limits at both reverse proxy and Express layers where possible.
- Do not expose MongoDB or internal admin services directly to the public internet.

### 14.3 Graceful shutdown

- Handle `SIGTERM` and `SIGINT`.
- Stop accepting new requests, allow in-flight requests to complete within a bounded grace period, then close Mongoose and other clients.
- Do not close the database while active requests still need it.
- Make shutdown idempotent and log its result without secrets.
- Do not use `process.exit()` inside request handlers.

### 14.4 Release and rollback

- Build from a reviewed commit and committed lockfile.
- Keep environment secrets outside the artifact.
- Run tests, build, audit, lint/typecheck when configured, and smoke tests.
- Confirm database compatibility and backup/restore expectations before schema/index changes.
- Deploy with a rollback or forward-fix plan.
- Verify health/readiness and critical user flows after deployment.
- Do not mark production release complete until login, public product reads, admin product operations, and media integration have been verified in the target environment.

---

## 15. Current Project Gaps and Explicit Follow-up Items

This section prevents the standard from being mistaken for a claim that all rules are already implemented.

The following items were not fully demonstrated in the reviewed work and MUST be verified or tracked before Production-Ready approval:

1. **Cloudinary test integration:** The test `.env` did not have Cloudinary credentials. Product creation reached the Cloudinary adapter and failed with “Cloudinary environment variables are not configured”. A successful real test upload/delete has not yet been demonstrated.
2. **Public API review:** `routes/products.ts` and `public-product.controller.ts` still require a complete security and contract review.
3. **Environment validation:** `config/env.ts` requires review for required keys, safe defaults, URL validation, numeric ranges, and fail-fast behavior.
4. **Database lifecycle:** `config/db.ts` requires review for Mongoose connection options, pool sizing, readiness, and shutdown.
5. **Cloudinary configuration:** `config/cloudinary.ts` requires review for startup validation, credential separation, timeouts, and error redaction.
6. **Seed safety:** `seed.ts` requires review to ensure it cannot accidentally seed or overwrite production data and does not contain default credentials.
7. **JWT hardening:** Explicit algorithm allow-list, issuer/audience policy, token expiration requirements, and copied-token/logout semantics require final review.
8. **Cookie deployment model:** Production frontend/backend site relationship and the need for `SameSite=None` must be documented and verified. Keep `Secure=true` in production.
9. **CSRF coverage:** Confirm every future cookie-authenticated state-changing route applies trusted-origin/CSRF checks; add token-based CSRF protection if deployment topology requires it.
10. **Central error handling and structured logging:** Controllers currently contain route-level error handling. Review for consistent error mapping, duplicate logs, redaction, and request correlation.
11. **Mongoose schema and index review:** Review product schema validators, allowed enum values, indexes, query plans, and migration approach.
12. **Upload coverage:** Add real test fixtures for every enabled format (JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, QuickTime). Current tests do not by themselves prove support for all formats.
13. **Upload resource bounds:** Review aggregate in-memory buffer usage and maximum concurrent uploads. Per request, three 25 MB files can hold approximately 75 MB of raw file buffers.
14. **Runtime/CI pinning:** Confirm `node -v`, pin the runtime, add `engines`, and ensure CI uses `npm ci`.
15. **Lint/typecheck automation:** Add ESLint and an explicit no-emit typecheck if adopted; do not claim these checks passed until they run.
16. **Production artifact smoke test:** Verify the compiled `dist` output starts and serves the required routes in a production-like environment.
17. **Angular SSR security:** Review cookie forwarding and request isolation so one user's authentication context cannot leak to another SSR request.
18. **Credential rotation:** Any real database password, JWT secret, or provider key exposed outside the intended secret store MUST be rotated before production use.

Track each item as **Open**, **In Progress**, **Verified**, or **Accepted Risk**, with an owner and review date. A finding is not closed merely because a related unit test passes.

---

## 16. Definition of Done for Alrayan Palace

A change is complete only when all applicable checks below are satisfied.

### Functionality and architecture

- [ ] Acceptance criteria are explicit and verified.
- [ ] Existing routes and frontend consumers were checked before changing an API.
- [ ] Controllers, middleware, services, models, and configuration have clear responsibilities.
- [ ] No raw request object is passed into Mongoose queries or Cloudinary calls.
- [ ] No unreviewed breaking API or data-model change was introduced.
- [ ] No unintended payment, customer-account, or order functionality was added.

### Security

- [ ] Authentication and authorization are enforced server-side.
- [ ] CSRF/trusted-origin policy covers cookie-authenticated writes.
- [ ] CORS is explicit and does not substitute for CSRF.
- [ ] Cookie attributes match login/logout behavior and production HTTPS requirements.
- [ ] JWT algorithm and claims are validated explicitly.
- [ ] Secrets are absent from source, logs, frontend bundles, and API responses.
- [ ] Product input and query parameters are validated and allow-listed.
- [ ] Uploads enforce size, count, allowed types, and signature checks.
- [ ] Cloudinary test and production resources are isolated.
- [ ] Internal errors are logged safely and never exposed to clients.

### Data and reliability

- [ ] Mongoose connection lifecycle and readiness are correct.
- [ ] Queries are bounded and supported by appropriate indexes.
- [ ] Product writes preserve data consistency.
- [ ] Cloudinary partial-failure cleanup is handled and logged.
- [ ] Memory use and concurrent upload limits are acceptable.
- [ ] External dependencies have sensible timeouts and safe failure behavior.
- [ ] Shutdown closes resources in the correct order.

### Verification and release

- [ ] Unit tests pass.
- [ ] Relevant HTTP/integration tests pass.
- [ ] Database/provider integration tests run against isolated test resources where required.
- [ ] TypeScript build passes.
- [ ] Format check passes.
- [ ] Lint/typecheck pass when configured.
- [ ] `npm audit` has been reviewed.
- [ ] Production artifact smoke test passes.
- [ ] Configuration and deployment instructions are documented.
- [ ] Rollback/forward-fix strategy is understood.
- [ ] Critic verdict is **APPROVED**.

---

## 17. Required Format for AI-Assisted Changes

For significant changes, the AI assistant MUST provide:

```text
1. DISCOVERY
   - Existing behavior and relevant files
   - Requirements, constraints, and risks

2. PLANNER
   - Acceptance criteria
   - Module responsibilities and data flow
   - Security boundary and failure behavior
   - Test strategy

3. PROGRAMMER
   - Complete implementation for the requested scope
   - Full files when explicitly requested
   - No omitted catch blocks, placeholders, or unexplained TODOs
   - Integration instructions and configuration changes

4. TESTER
   - Unit and integration tests
   - Exact commands executed and actual results
   - Explicit list of untested external boundaries

5. CRITIC
   - Security, correctness, architecture, resource, and data review
   - Remaining action items
   - Verdict: APPROVED or REVISED ACTION ITEMS
```

AI assistants MUST NOT:

- Claim that tests/build/audit passed unless they were actually run.
- Claim a system is Production-Ready based only on `npm audit` or unit tests.
- Invent project files, APIs, dependency versions, or runtime behavior.
- expose secrets in code, logs, tests, or documentation.
- Use frontend guards as an authorization boundary.
- Treat CORS or SameSite alone as complete CSRF protection.
- Treat magic-byte detection as malware scanning or proof of full file validity.
- Silently switch MongoDB drivers, package managers, test runners, or major dependencies.
- Perform broad rewrites when a small, safe change is sufficient.
- Return partial code when the user explicitly requested a complete file.

---

## 18. Official References

Use documentation matching the versions pinned in `package-lock.json` and the deployment runtime. These links are references, not substitutes for testing the actual project:

- Node.js: <https://nodejs.org/docs/>
- Node.js release schedule: <https://nodejs.org/en/about/previous-releases>
- TypeScript: <https://www.typescriptlang.org/docs/>
- Express 5: <https://expressjs.com/en/5x/api.html>
- Express 5 migration guide: <https://expressjs.com/en/guide/migrating-5.html>
- Mongoose: <https://mongoosejs.com/docs/>
- MongoDB Atlas security: <https://www.mongodb.com/docs/atlas/security/>
- MongoDB Node.js driver: <https://www.mongodb.com/docs/drivers/node/current/>
- Multer: <https://github.com/expressjs/multer>
- Cloudinary Node.js SDK: <https://cloudinary.com/documentation/node_integration>
- `file-type`: <https://github.com/sindresorhus/file-type>
- OWASP Top 10: <https://owasp.org/www-project-top-ten/>
- OWASP Application Security Verification Standard: <https://owasp.org/www-project-application-security-verification-standard/>
- OWASP CSRF Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>
- OWASP Node.js Security Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html>
- RFC 9457 Problem Details: <https://www.rfc-editor.org/rfc/rfc9457>
- OpenAPI: <https://spec.openapis.org/oas/latest.html>

---

**Final project rule:** Build the smallest architecture that gives Alrayan Palace explicit ownership, validated inputs, reliable product/media consistency, server-enforced administrator access, safe failure handling, and repeatable verification. Add complexity only when a documented requirement or measured risk justifies it. Production readiness is demonstrated by behavior in an isolated production-like environment—not by the size of this document, a clean dependency audit, or a successful development-server run.
