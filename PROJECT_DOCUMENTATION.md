# Plutus Backend Documentation

## 1. Project Overview
- Node.js/Express backend application
- PostgreSQL database with row-level security
- Modular architecture with Common, Tenant, and SuperAdmin modules
- REST API implementation
- Multi-tenant architecture with role-based access control

## 2. Directory Structure
```
plutus-backend/
├── bin/                 # Scripts and executables
├── log/                 # Application logs
├── src/                 # Source code
│   ├── app.js           # Main application entry point
│   ├── common/          # Shared functionality
│   ├── superAdmin/      # SuperAdmin module
│   └── tenant/          # Tenant module
├── .eslintrc.yml        # ESLint configuration
├── package.json         # Project dependencies
└── README.md            # Basic project information
```

## 3. Configuration
- Environment variables managed through `src/common/util/config.js`
  - `dotenv` is loaded once at the top of this module, which reads `process.env` and re-exports typed, named constants (e.g. `PORT`, `RATE_LIMIT`, `TENANT_CONTEXT`) — the rest of the app imports from here rather than reading `process.env` directly, giving a single source of truth for config.
  - Environment-specific values (`PG_CONNECTION_OBJ`, `RESEND_CONFIG`, `APP_BASE_URL`, …) are selected off `NODE_ENV` inside this module.
- SSL/TLS certificates stored in `src/common/util/ca-certificate.crt`
- Logging configuration in `src/common/util/logger.js`
- Database configuration and connection pooling in `src/common/db/index.js`
  - Connections are pooled once at module load and reused for the process lifetime rather than opened per request, amortizing TCP/TLS/auth handshake cost and bounding concurrent DB connections.
  - See "Multi-Tenancy & Row-Level Security" below for the two pools and how each is used.

## 4. Application Architecture
The codebase follows a consistent **layered architecture**. Each feature folder (e.g. `contact`, `activity`, `auth`) is organized into the same four layers:

1. **Router Layer** (`xRouter.js`) — declares HTTP routes and wires per-route middleware (rate limiter → `authorize` → validator → controller). Routers use `express-promise-router`.
2. **Controller Layer** (`xController.js`) — handles the request/response cycle: reads `req`, calls services, shapes the HTTP response and status code.
3. **Service Layer** (`xService.js`) — implements business logic and orchestrates one or more data-access calls; contains no HTTP concerns.
4. **Data Access Layer** (`xDAL.js`) — owns SQL and transactions, executed through the shared `db` helper.

Validation lives alongside each feature in `xValidator.js` (see "Input Validation" below).

- **Async error propagation:** because routers are built with `express-promise-router`, a rejected promise in any async controller/service is automatically forwarded to the centralized error handler (see "Error Handling" below) — no `try/catch` boilerplate is needed in every handler.
- **Why this structure:** separation of concerns keeps HTTP, business logic, and persistence independently testable, and every module reads the same way, lowering the cost of onboarding and refactoring.

## 5. Authentication & Authorization
Stateless JWT authentication combined with role-based access control (RBAC).

### Authentication (JWT)
- On successful login ([src/common/auth/authController.js](src/common/auth/authController.js)) a JSON Web Token is signed **HS256** with `process.env.SECRET`. The payload carries `{ orgId, userId, email, role }`.
- **Token expiry:** `16h` by default, extended to `7d` when the client sends `remember: true`.
- Clients send the token as an `Authorization: Bearer <token>` header. `tokenExtractor` ([src/common/util/middleware.js](src/common/util/middleware.js)) parses the header into `req.token`; token *verification* is performed by `express-jwt` inside `authorize()`.
- **Why stateless HS256:** no server-side session store is required, so any process/instance can validate a request independently, which scales horizontally. **Trade-off:** there is no token revocation list — a compromised token is valid until it expires, so expiry duration is the primary control.

### Authorization (RBAC)
- `authorize(roles)` is a middleware **factory** ([src/common/util/middleware.js](src/common/util/middleware.js)) returning an array `[expressJwt(...), roleCheck]`, applied per-route. It verifies the JWT, checks the caller's role against the allowed list, and then populates the per-request tenant context (`TENANT_CONTEXT`, see "Multi-Tenancy & Row-Level Security" below) from the verified token.
- **Roles** ([src/common/util/helper.js](src/common/util/helper.js)): `superAdmin` (1), `admin` (2), `standard` (3), `limited` (4), plus a special `root` super-role. `role` is stored as an integer foreign key to the `user_roles` table.
- **Auth surfaces:** there are three, each with its own router — common (`/auth`), tenant (`/:tenantId/auth`), and superAdmin (`/superadmin/auth`).

## 6. Multi-Tenancy & Row-Level Security
Tenant isolation is enforced at the **database** layer, not just in application code — the flagship architectural decision of this backend.

- **Tenant routing:** tenant-scoped requests are mounted under a URL path parameter, `app.use('/:tenantId', tenantAppRoutes)` ([src/app.js](src/app.js)).
- **Two connection pools** ([src/common/db/index.js](src/common/db/index.js)):
  - `tenantPool` — used for all tenant data; every query runs under row-level security.
  - `superAdminPool` — used for platform-level operations that intentionally operate across tenants and therefore **bypass** RLS.
- **Per-request identity via `AsyncLocalStorage`:** each request runs inside `tenantStorage.run({ orgId, userId }, …)` ([src/app.js](src/app.js)), and `TENANT_CONTEXT` reads/writes that request's store ([src/common/util/config.js](src/common/util/config.js)). This guarantees concurrent requests never share or leak tenant identity, even though the pools are shared.
- **Tenant query flow** (`db.query` in tenant mode): check out a single client → `SET app.current_tenant` and `SET app.current_userid` on that connection → run the query on the *same* connection → `RESET ALL` in a `finally` before releasing it back to the pool. Resetting prevents a connection from carrying one tenant's context into the next borrower.
- PostgreSQL RLS policies keyed on `current_setting('app.current_tenant')` then restrict every row a tenant query can see.
- **Why:** DB-enforced isolation is defense-in-depth — a query that forgets a tenant filter still cannot return another tenant's rows. **Trade-off / caveat:** correctness depends on `TENANT_CONTEXT` being set (done by `authorize()` on protected routes); superAdmin mode deliberately runs without it.

## 7. Modules & API Endpoints

### Common Module
- Shared functionality across the application (logger, middleware, DB connection, configuration).
- Routes — `/auth`:
  - POST /auth/login
  - POST /auth/request-pass
  - POST /auth/reset-pass

### Tenant Module
Mounted under `/:tenantId`.

- **/auth** — tenant authentication & user management:
  - POST /signup, GET /verify/:token, POST /confirm-email
  - GET /users, PATCH /users/:userId/role
- **/search** — GET / (global search; rate-limited as a heavy endpoint)
- **/report** — GET /life-events (life-events report; rate-limited as a heavy endpoint)
- **/activities** — GET /options, GET /, GET /recent (also mounted nested under `/contacts/:contactId/activities`)
- **/contacts/:contactId/notes** — POST /, GET /, PUT /:noteId, DELETE /:noteId
- **/contacts/:contactId/calls** — POST /, GET /, PUT /:callId, DELETE /:callId
- **/audit/contact** — GET /:contactId (contact audit trail)

#### Contact Management Module
##### API Endpoints (`/contacts`)
- GET /contacts - Get all contacts with pagination and filtering
- GET /contacts/stats/dashboard - Dashboard contact statistics
- GET /contacts/:id - Get a specific contact by ID
- GET /contacts/options/all - Get all contact options
- GET /contacts/options/contact-names - Get contact names
- GET /contacts/options/contact-types - Get contact type options
- GET /contacts/options/contact-statuses - Get contact status options
- GET /contacts/options/contact-owners - Get contact owner options
- GET /contacts/options/groupheads - Get group-head options
- GET /contacts/options/cities - Get city options
- POST /contacts - Create a new contact
- PUT /contacts/:id - Update an existing contact
- DELETE /contacts/batch - Delete multiple contacts
- DELETE /contacts/:id - Delete a contact

### SuperAdmin Module
Mounted under `/superadmin`. System administration features.

- **/subscriptionPlan** — GET /, POST /, PUT /:id (subscription plan management)
- **/auth** — POST /sa-signup, POST /sa-login, POST /signup, GET /verify/:token, POST /confirm-email, POST /

## 8. Input Validation
Request payloads are validated at the edge with `express-validator`, before any controller/service runs.

- Each feature ships a `xValidator.js` exporting arrays of `check(...)` validation chains (e.g. [src/common/auth/authValidator.js](src/common/auth/authValidator.js)).
- Chains use `.bail()` to short-circuit on the first failure, and support custom cross-field rules (e.g. `confirmPassword` must equal `password`) and transforms (`normalizeEmail`, `isStrongPassword`, `toBoolean`).
- Chains are terminated by `validationMiddleware` ([src/common/util/middleware.js](src/common/util/middleware.js)), which collects results and, on failure, responds `400` with `{ errors: [ ... ] }` (an array of field-level messages) — a distinct shape from the general error handler's `{ error: '...' }` (see "Error Handling" below).
- **Why:** rejecting malformed input at the boundary keeps invalid data out of the service and database layers and yields consistent, field-level client feedback.

## 9. Error Handling
- Centralized `errorHandler` is **defined in `src/common/util/middleware.js`** and registered last in the middleware chain in `src/app.js` (after all routes, alongside the `unknownEndpoint` 404 handler).
- It branches on `error.name` and maps each to a status + JSON body of the form `{ error: '...' }`:
  - `CastError` → 400 (malformatted id)
  - `ValidationError` → 400
  - `TypeError` → 400
  - `JsonWebTokenError` → 401 (invalid token)
  - `TokenExpiredError` → 401 (token expired)
  - `UnauthorizedError` → 401 (token missing / not authorized)
- Unmatched errors are passed through via `next(error)`; unknown routes are handled by `unknownEndpoint` → `404 { error: 'unknown endpoint' }`.
- Async errors from controllers/services are routed here automatically by `express-promise-router` (see "Application Architecture" above). Validation errors instead use the `{ errors: [...] }` shape from `validationMiddleware` (see "Input Validation" above).
- All handled errors are logged through Winston (see "Logging" below).

## 10. Logging
- Winston logger configured in `src/common/util/logger.js`; default level `http` (override with `LOG_LEVEL`), JSON format with timestamps.
- HTTP access logs are produced by `morgan` and piped into Winston via `logger.http` (configured in `src/app.js`).
- Transports:
  - Console
  - Daily-rotate combined log — `./log/combined-%DATE%.log`, 20MB max size, 14-day retention
  - Daily-rotate error log — `./log/app-error-%DATE%.log`, `error` level, 30-day retention
- Dedicated `exceptionHandlers` and `rejectionHandlers` write uncaught exceptions and unhandled promise rejections to their own daily-rotate files (30-day retention).

## 11. Security Considerations
Authentication, RBAC, row-level security, input validation, and logging are each covered in their own sections above. Additional measures:
- Connection security (SSL/TLS to PostgreSQL)
- Environment variable management (see "Configuration")
- API rate limiting (per-IP, fixed-window via `express-rate-limit`):
  - Global limiter on all routes — default 100 requests/minute
  - Strict shared limiter on public auth endpoints (login, password reset, email confirmation/verification) — default 10 requests/15 minutes, pooled across all auth endpoints to resist brute-force
  - Heavy limiter on expensive endpoints (search, life-events report) — default 30 requests/minute
  - Standard `RateLimit` headers (IETF draft-7) plus `Retry-After` on `429` responses
  - Tunable via `RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_HEAVY_MAX`
  - `TRUST_PROXY_HOPS` controls how many reverse-proxy hops to trust for client IP resolution (0 = direct; set to 1 behind a single load balancer/proxy)
  - In-memory store (single process); swap to a shared store (e.g. Redis) via the limiter's `store` option when scaling horizontally

## 12. Development Practices
- ESLint configuration (airbnb-base)
- Git version control
- Modular code organization
- Comprehensive logging
- Error handling patterns
- Documentation standards
- Code quality checks
