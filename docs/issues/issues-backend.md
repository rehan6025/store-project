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
