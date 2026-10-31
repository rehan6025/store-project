# Sellvia — Project Context & Handoff Guide

> **Document Purpose**: Complete technical, architectural, and operational context for resuming development on any machine.
> **Last Updated**: October 31, 2026
> **Current Git Branch**: `main` (Clean, in sync with `origin/main`)
> **Build Status**: Passing (TypeScript 0 errors, Vitest 57/57 unit tests passing)

---

## 1. Project Overview & System Architecture

Sellvia is a multi-tenant e-commerce platform that enables independent merchants to create, customize, and manage online storefronts on shared infrastructure. It is designed to handle custom subdomains, dynamic schema-driven storefronts, tenant isolation, and high-concurrency commerce events (flash sales).

### Tech Stack

| Layer | Technologies | Role / Notes |
| :--- | :--- | :--- |
| **Backend Framework** | NestJS 12 (TypeScript, Node.js ESM) | Modular architecture, dependency injection, global guards |
| **Database & ORM** | PostgreSQL 18 + Prisma ORM 7 | Relational multi-tenant schema with `@prisma/adapter-pg` |
| **Caching & In-Memory** | Redis 7 (`redis` v6) | Domain resolution cache, session store, cooldowns |
| **Authentication & Crypto** | `@node-rs/argon2`, `@nestjs/jwt` | Argon2id hashing with pepper, 7-day signed JWTs |
| **Validation & Schema** | Zod (v4), class-validator | Schema-driven storefront JSON validation |
| **Testing** | Vitest 4 | Fast isolated unit tests + Dockerized integration tests |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Zustand | Merchant dashboard & schema-driven dynamic storefronts |
| **Infrastructure** | Docker Compose | Local PostgreSQL (port 5435) & Redis (port 6379) |

### Key Architectural Patterns
1. **Strict Multi-Tenant Isolation**:
   - Every store-scoped table (`products`, `categories`, `orders`, `carts`, `domains`, `store_configs`, `inventories`) includes `storeId`.
   - Controllers verify merchant ownership (`store.ownerUserId === user.id`) before allowing mutations, throwing `403 Forbidden` (not `404`) on IDOR attempts.
2. **Global Auth Layer (`@Global() AuthModule`)**:
   - `JwtAuthGuard` intercepts incoming requests, validates `Authorization: Bearer <token>`, and attaches `JwtPayload` to `request.user`.
   - Custom `@CurrentUser()` parameter decorator provides clean, type-safe access to `{ sub, email, role }`.
   - Legacy `x-user-id` header placeholders are completely removed across all merchant controllers.
3. **Anti-Phishing & SEO-Safe Slug Redirection**:
   - Changing a store slug automatically creates an atomic record in `slug_redirects`.
   - Storefront routes issue `301 Moved Permanently` to preserve customer links and SEO ranking.
   - Enforces a 30-day cooldown to prevent immediate slug squatting and phishing attacks.
4. **Dynamic Storefront Configuration (`StoreConfigModule`)**:
   - Stores store visual layouts as versioned JSON blobs validated against a strict Zod schema (`StoreConfigContentV1Schema`).
   - Supports atomic publishing, instant rollbacks to previous revisions, and a fallback `v0` layout template when unseeded.
5. **Two-Tier Domain Resolution (`DomainsModule`)**:
   - Resolves visitor hostnames (`store-slug.sellvia.com` or custom domains like `bakery.com`) via Redis with sub-5ms latency, falling back to PostgreSQL.

---

## 2. Recent Implementations & Resolved Issues

### A. Merchant Authentication System (PR #16 Merged)
- Implemented `AuthModule` containing `AuthService`, `AuthRepository`, `AuthController`, and `JwtAuthGuard`.
- Added endpoints:
  - `POST /auth/register`: Lowercases email, validates password length (>= 6 chars), rejects duplicates (`409 Conflict`), hashes with Argon2id + pepper, and returns a signed 7-day JWT.
  - `POST /auth/login`: Verifies Argon2id hash with timing-safe checks, returns a signed 7-day JWT.
  - `GET /auth/me`: Protected route returning the current authenticated user profile.
- Replaced all legacy `x-user-id` headers with `@UseGuards(JwtAuthGuard)` and `@CurrentUser() user: JwtPayload` in:
  - `StoresController` (`createStore`, `updateStore`)
  - `ProductsController` (`createProduct`, `archiveProduct`)
  - `CategoriesController` (`createCategory`, `updateCategory`, `deleteCategory`)
  - `DomainsController` (`addDomain`, `getStoreDomains`, `removeDomain`)
  - `StoreConfigController` (`getConfigHistory`, `publishConfig`, `rollbackConfig`)
  - `OrdersController` (`getStoreOrders`)
- Wrote full unit test suite (`auth.service.spec.ts`) using real in-memory `JwtModule` and Argon2id hash verification (6/6 passing).

### B. The Argon2 Platform Fix (`commit 96952fb`)
- **Problem**: The original `argon2` npm package requires native compilation via `node-gyp`, requiring Python and C++ build toolchains (Visual Studio Build Tools on Windows, gcc/make on Linux). When transferring code across laptops or running in minimal CI containers, `npm install` would crash or fail to build native bindings.
- **Resolution**: Migrated dependency to `@node-rs/argon2`. This uses pre-built N-API Rust binaries for all architectures (Windows, macOS, Linux, ARM/x64). It installs instantly with zero compilation dependencies while retaining full Argon2id configuration, secret pepper support, and high performance.

### C. Domain Resolution & Anti-Phishing Cooldown (PR #15 Merged)
- Built `DomainsModule` with 15/15 unit tests.
- Implemented Redis caching for hostname lookups.
- Added 30-day expiration check on `slugRedirects`: redirects older than 30 days expire, freeing up slugs safely while preventing immediate phishing.

---

## 3. Current Project State

- **Branch**: `main`
- **Working Tree**: Clean (`git status` shows nothing to commit).
- **Test Status**: **57 / 57 Unit Tests Passing** across 9 test files.
- **Build Status**: `npm run build` exits with code 0 (zero TypeScript errors).

### Existing Modules in `backend/src/`:
- `auth`: Merchant registration, login, token issuance, `JwtAuthGuard`, `@CurrentUser()`
- `stores`: Store creation, slug validation, slug redirect with 30-day cooldown
- `products`: Product catalog, pricing, initial inventory creation, archiving
- `categories`: Category taxonomy management, store ownership checks
- `customers`: Customer accounts and shopper profiles
- `carts`: Shopping cart creation and item mutations
- `orders`: Checkout flow converting carts to orders, order status lifecycle
- `payments`: Adapter pattern for payment gateways, idempotent transaction processing
- `store-config`: Dynamic layout versioning, rollback, Zod schema validation
- `domains`: Custom domain mapping & subdomain resolution with Redis
- `prisma`: Database client provider with PostgreSQL adapter
- `redis`: Redis client provider for caching
- `health`: Database & server liveness probe

---

## 4. Local Environment & Machine Setup

When setting up on a new laptop, follow this exact sequence:

### Prerequisites
- **Node.js**: >= 20.x
- **Docker Desktop** (or Docker Engine + Compose)
- **Git**

### Step 1: Clone & Install Dependencies
```bash
git clone <repo-url> store-project
cd store-project
npm install
```

### Step 2: Configure Environment Variables
Create `backend/.env` with the following values:
```env
PORT=3003
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/store-builder?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="sellvia-dev-secret-key-change-in-prod"
PASSWORD_PEPPER="sellvia-dev-pepper-secret-buffer"
```

### Step 3: Start Infrastructure
From the project root:
```bash
docker compose up -d
```
*Verification*: Ensure PostgreSQL is listening on port `5435` and Redis on `6379`.

### Step 4: Run Database Migrations & Seeds
```bash
cd backend
npx prisma generate
npx prisma db push # or npx prisma migrate dev
npm run seed
```

### Step 5: Verify Testing & Build
```bash
# Run all unit tests (isolated, no docker needed for unit tests)
npm run test:unit

# Run TypeScript compilation check
npm run build
```

---

## 5. Development Quirks & Gotchas to Keep in Mind

1. **Docker Postgres Port is `5435`**:
   The host port mapped in `docker-compose.yaml` is `5435:5432` to avoid collisions with standard local PostgreSQL instances running on `5432`. Always use port `5435` in `DATABASE_URL`.
2. **Unit Tests vs. Integration Tests**:
   - `npm run test:unit` (`vitest run --exclude '**/*.integration.spec.ts'`) mocks external dependencies and runs in < 5 seconds without Docker.
   - `npm run test:integration` runs integration specs and **requires** Docker containers to be running.
3. **Controller Unit Test Guard Overrides**:
   When writing or updating controller unit tests (`*.controller.spec.ts`), always override `JwtAuthGuard` in the test module:
   ```typescript
   const module = await Test.createTestingModule({ ... })
       .overrideGuard(JwtAuthGuard)
       .useValue({ canActivate: () => true })
       .compile();
   ```
4. **GPG Commit Signing on Windows**:
   If `git commit` hangs with `signing failed: Timeout`, it is due to pinentry waiting for a GUI prompt. Either run `gpgconf --launch gpg-agent` or pass `--no-gpg-sign` for local commits.
5. **Windows Drive Letters**:
   If working on external or secondary drives, ensure drive letters do not unmount or change (e.g. `E:` vs `F:`) to avoid path resolution errors in IDE tooling.

---

## 6. Next Implementation Plan & Pending Tasks

The immediate priority is completing the backend commerce roadmap, specifically the **Flash Sale & High-Concurrency Reservation Engine**, followed by **Customer Authentication**.

### Feature 1: Flash Sale & Concurrency Engine (Priority 1)

*Context*: The database schema already defines `FlashSale` and `Reservation` models in `backend/prisma/schema.prisma`. This is a flagship systems-engineering feature on your resume.

#### Tasks:
1. **`FlashSalesModule` Creation**:
   - Create `backend/src/flash-sales/` with module, controller, service, and repository.
   - Merchant endpoints (protected by `JwtAuthGuard`):
     - `POST /stores/:storeId/flash-sales`: Create flash sale with `startsAt`, `endsAt`, `salePrice`, `stockLimit`.
     - `GET /stores/:storeId/flash-sales`: List store's flash sales.
   - Public/Shopper endpoints:
     - `GET /stores/:storeId/flash-sales/active`: View currently running flash sales.
2. **Atomic Inventory Reservation (Concurrency Control)**:
   - *Problem*: Flash sales generate hundreds of requests per second for limited items. Direct DB reads/writes cause race conditions (overselling).
   - *Implementation*:
     - Use Redis atomic decrement (`DECRBY` or a Lua script) to check and reserve flash sale stock in-memory in < 2ms.
     - Fallback / Persistence: Create a `Reservation` record in Postgres with status `RESERVED` and a 10-minute `expiresAt` window.
3. **Reservation Expiration Worker (BullMQ + Redis)**:
   - When a reservation is created, schedule a delayed job in BullMQ (10 minutes).
   - If the customer does not complete checkout before expiry, the worker releases the reserved count back to available stock and sets status to `EXPIRED`.
4. **Acceptance Criteria**:
   - 0 overselling under concurrent load test (e.g., 50 parallel requests for 10 items).
   - Expired reservations automatically restore inventory.

---

### Feature 2: Customer Storefront Authentication (Priority 2)

*Context*: Merchants are now secured via `AuthModule`. However, shoppers currently identify via an `x-customer-id` header in `OrdersController` and `PaymentsController`.

#### Tasks:
1. Add `CustomerAuthGuard` for storefront routes.
2. Implement customer JWT issuance (distinguishing `role: "CUSTOMER"` vs `role: "MERCHANT"`).
3. Update `orders.controller.ts` and `payments.controller.ts` to consume `@CurrentCustomer()`.
4. Acceptance Criteria:
   - Shoppers can register and login on a per-store basis (`storeId + email` uniqueness).
   - Shoppers cannot view or pay for another customer's order.

---

### Feature 3: Frontend Integration (Priority 3)

*Context*: `frontend/` contains a React 19 + Vite + Tailwind v4 scaffold with Zustand and React Router 8.

#### Tasks:
1. Connect `frontend/src/features/auth` to `POST /auth/login` and `POST /auth/register`.
2. Store JWT in secure storage and set up an Axios/Fetch interceptor to attach `Authorization: Bearer <token>`.
3. Build the Merchant Store Manager (create store, list stores, edit config).
4. Implement dynamic storefront renderer driven by `GET /storefront/:slug/config`.

---

## 7. Quick Reference Command Cheat Sheet

```bash
# Start Postgres & Redis
docker compose up -d

# Stop Infrastructure
docker compose down

# Run All Unit Tests
cd backend && npm run test:unit

# Run All Integration Tests (requires Docker up)
cd backend && npm run test:integration

# Run TypeScript Build Verification
cd backend && npm run build

# Start Backend in Watch/Dev Mode
cd backend && npm run dev

# Regenerate Prisma Client
cd backend && npx prisma generate

# Inspect Database via Prisma Studio
cd backend && npx prisma studio --port 5555

# Start Frontend Dev Server
cd frontend && npm run dev
```
