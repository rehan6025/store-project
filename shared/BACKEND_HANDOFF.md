# Backend Handoff

Base URL: `http://localhost:3000` (unless the backend `PORT` is changed).

- `GET /health` - Checks that the API and database are available.
- `GET /stores/:storeId/products` - Returns products for a numeric store ID; currently returns archived products too and has no pagination.

That is the complete live API right now. Store, cart, order, payment, inventory, category, flash-sale, reservation, domain, auth, and storefront-config endpoints are not available yet.

For shared frontend types and seeded development values, use [`backend-api.ts`](backend-api.ts).

Local backend setup: start PostgreSQL with `docker compose up -d`, set `DATABASE_URL` to port `5435`, then run `npm run seed` and `npm run dev` from `backend/`.
