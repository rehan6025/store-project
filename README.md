# Sellvia

Sellvia is a multi-tenant e-commerce platform that helps local businesses create and manage their own online stores.

Each store gets its own storefront while all stores are powered by the same Sellvia platform.

## 🚧 Project Status

Currently under development.

The project is being built with a focus on:

- Multi-tenant architecture
- Store and product management
- Customizable storefronts
- Secure checkout and inventory management
- Flash-sale handling under high concurrency
- Caching and asynchronous processing
- Automated testing and load testing

## 🚀 Implemented Engineering Flows

1. **Flow 1: Multi-Tenant Storefront Resolution**
   - Subdomain and custom domain routing with sub-5ms Redis caching (`DomainsModule`).
   - Anti-phishing slug redirects with 30-day cooldown and 301 redirects.
2. **Flow 2: Schema-Driven Storefront Builder**
   - Dynamic layout storage with strict Zod schema validation (`StoreConfigModule`).
   - Working draft auto-saving, preview fallback, atomic publishing, and instant rollback.
3. **Flow 3: Scoped Customer Auth, Cart & Checkout Engine**
   - Per-store customer isolation with Argon2id + pepper password hashing and customer JWTs.
   - Atomic multi-item cart-to-order checkout with inventory decrementing and 15-minute hold windows.
   - Idempotent payment processing, retry audit logs, and external webhook handling.
4. **Flow 4: Flash Sale & High-Concurrency Reservation Engine**
   - In-memory Redis Lua scripts for atomic stock checks & decrements in <1ms with **0 overselling**.
   - BullMQ asynchronous reservation persistence smoothing out database write spikes.
   - Active BullMQ delayed restocking workers (10m for flash sales, 15m for normal checkout) preventing inventory hoarding.
   - Declarative `StoreOwnerGuard` perimeter security eliminating IDOR boilerplate.

## 🏗️ Architecture

Sellvia uses a monorepo architecture:

```text
sellvia/
├── frontend/     # React 19, Vite, Tailwind CSS v4, Zustand
├── backend/      # NestJS 12, PostgreSQL 18, Prisma 7, Redis 7, BullMQ
├── shared/       # Shared contracts, types, and BACKEND_HANDOFF.md
└── package.json
```
