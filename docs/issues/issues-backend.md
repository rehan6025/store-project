# Major Challenges & System Design Notes

### 1. Multi-Tenancy & IDOR (Security)
- **Problem**: Querying or updating a store by `id` alone allows attackers to mutate another merchant's store.
- **Solution**: Enforced ownership checks (`store.ownerUserId !== userId`) returning `403 Forbidden` vs `404 Not Found`.

### 2. Privilege Escalation via DTOs (Security)
- **Problem**: Exposing `plan` in user inputs allows clients to assign themselves `ENTERPRISE` for free.
- **Solution**: Stripped `plan` from client DTOs, default to `BASIC`, and restrict upgrades to billing/webhook handlers.

### 3. Slug Concurrency & Race Conditions (Data Integrity)
- **Problem**: Two users claiming the same slug simultaneously both pass `findFirst` checks (TOCTOU).
- **Solution**: Enforced `@unique` at the database level and caught Prisma's `P2002` constraint error.

### 4. Slug Changes & Broken Links (System Design)
- **Problem**: Renaming a store's slug breaks customer bookmarks, search engine SEO (404s), and enables slug squatting.
- **Solution**:
  - Introduced a `SlugRedirect` table.
  - Wrapped slug changes in an atomic `$transaction`.
  - Resolve storefront routes with `301 Moved Permanently` when an old slug is requested.
  - Allow merchants to reclaim their own previous slugs without conflicts.

### 5. Memory Exhaustion / OOM (Scalability)
- **Problem**: Unbounded `findMany()` loads entire tables into memory, causing Node.js OOM crashes under load.
- **Solution**: enforce pagination (`take`/`skip` or cursor-based).

### 6. The Asynchronous Queue Redirect & UX Lag (System Design & Concurrency)
- **The Problem / Discovery**: While analyzing the Flow 4 architecture (`POST /reserve` -> Message Queue -> Workers -> Database), a critical UX gap was uncovered:
  - If a reservation is processed asynchronously via BullMQ to protect PostgreSQL from connection exhaustion, how can the frontend redirect the user to the payment screen if the database row (`reservationId`) doesn't exist yet during the 1–2 second worker processing lag?
  - A naive design where users wait 5 minutes or receive a delayed "ping" to come back and pay is unacceptable e-commerce UX.
- **The Architectural Reality**:
  - A pooled PostgreSQL insert takes ~2ms. With a worker concurrency of 25, BullMQ clears 12,500 jobs per second.
  - A burst of 20,000 requests is cleared in ~1.5 seconds, meaning queue lag is measured in **hundreds of milliseconds, not minutes**.
- **The Solution (The Polling / Job-Ticket Pattern)**:
  - The API admits the customer via an in-memory Redis Lua script (<1ms), enqueues the persistence task, and immediately returns `202 Accepted` with a `{ jobId }` in 10ms.
  - The frontend button displays a sleek 1–2 second loading indicator (*"Holding your spot in line..."*) while polling `GET /flash-sales/jobs/:jobId` every 500ms (or listening via WebSockets/SSE).
  - As soon as the worker writes the row to PostgreSQL, it marks the job `COMPLETED` with `{ reservationId }`.
  - The frontend automatically executes `navigate('/checkout/payment?reservationId=...')`. The user experiences a standard 1.5-second booking spinner before landing smoothly on the payment screen.

### 7. Inventory Hoarding Vulnerability & Active Restocking Workers (Data Integrity)
- **The Problem / Discovery**: In Flow 3 (Normal Checkout), stock compensation was **lazy**—it only ran if the customer actively submitted a payment attempt after the 15-minute window expired.
  - If an attacker added 100 items to their cart, checked out, and simply closed their laptop without paying, that inventory remained locked in `PENDING` status indefinitely. No other shopper could purchase it.
- **The Solution (Unified BullMQ Active Restock Engine)**:
  - Replaced lazy expiration with **active background expiration**:
    - **Normal Orders**: When an order is created, schedule a delayed BullMQ job on `order-expirations` with `delay: 15 * 60 * 1000`.
    - **Flash Sales**: When a reservation is persisted, schedule a delayed BullMQ job on `flash-sale-expirations` with `delay: 10 * 60 * 1000`.
  - When the worker fires:
    - It checks if the status is still `PENDING` or `RESERVED` (abandoned checkout).
    - If unpaid, it marks the status `CANCELLED` / `EXPIRED` in PostgreSQL.
    - Atomically increments inventory stock in PostgreSQL (for normal orders) and Redis via `INCRBY` (for flash sales), freeing stock back to the public without requiring user intervention.

### 8. Queue Lag & Expiration Timer Drift (Distributed Systems)
- **The Problem / Discovery**: If the HTTP controller schedules the 10-minute delayed cancellation job at the moment of request arrival ($t=0$), but extreme queue backpressure delays the persistence worker by 2 minutes ($t=2$), the user would only get 8 minutes to check out. In worst-case lag, the cancellation could fire before the user even reached the payment screen.
- **The Solution**: The delayed expiration job must be scheduled **inside the persistence worker**, computed from `now() + 10 minutes` at the exact moment the row is written to PostgreSQL. This guarantees the customer always receives their full 10-minute checkout window regardless of upstream queue latency.

### 9. Multi-Tenant IDOR Deduplication via `StoreOwnerGuard` (Clean Architecture)
- **The Problem**: 12 lines of store existence and ownership verification (`store.ownerUserId !== userId`) were copy-pasted across every service (`products`, `categories`, `store-config`, `domains`, `flash-sales`), bloating codebase LOC and increasing maintenance overhead.
- **The Solution**:
  - Implemented a declarative perimeter guard: `@UseGuards(JwtAuthGuard, StoreOwnerGuard)`.
  - Intercepts requests, validates `params.storeId`, fetches the store once, enforces tenant boundary (`403 Forbidden` vs `404 Not Found`), and attaches `request.store = store`.
  - Eliminated redundant queries and boilerplate across all downstream controllers and services.
