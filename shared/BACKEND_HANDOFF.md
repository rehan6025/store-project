# Sellvia — Backend Handoff Guide

Base URL: `http://localhost:3003` (or configured `PORT`).

---

## 1. Authentication for Merchant Endpoints
All merchant endpoints require the JWT token issued upon login/registration:
```http
Authorization: Bearer <jwt_token>
```

- `POST /auth/register`: `{ email, password }` $\rightarrow$ `{ token, user }`
- `POST /auth/login`: `{ email, password }` $\rightarrow$ `{ token, user }`
- `GET /auth/me`: Profile of current logged-in user.

---

## 2. Flow 1: Storefront Rendering (Public Endpoints)

Use these endpoints to render public-facing storefronts (subdomain or custom domain):

### A. Resolve Domain / Hostname
```http
GET /domains/resolve?hostname=rehan-bakery.sellvia.com
```
* **Response**:
  ```json
  {
    "storeId": 1,
    "storeSlug": "rehan-bakery",
    "storeName": "Rehan's Bakery",
    "hostname": "rehan-bakery.sellvia.com"
  }
  ```

### B. Fetch Published Store Configuration
```http
GET /storefront/:slug/config
# or
GET /stores/:storeId/config
```
* **Response**:
  ```json
  {
    "schemaVersion": "1.0.0",
    "storeId": "1",
    "version": 3,
    "meta": { "name": "Rehan's Bakery" },
    "theme": {
      "colors": { "primary": "#E11D48", "background": "#FFFFFF", "text": "#0F172A" },
      "fonts": { "heading": "Inter", "body": "Inter" }
    },
    "pages": [
      {
        "id": "p-home",
        "slug": "/",
        "title": "Home",
        "sections": [
          { "id": "s-hero", "type": "hero", "props": { "heading": "Welcome" } },
          { "id": "s-products", "type": "product-grid", "props": { "title": "Featured", "columns": 3 } }
        ]
      }
    ]
  }
  ```
*(Cached via Redis for sub-5ms response).*

### C. Fetch Store Products
```http
GET /stores/:storeId/products
```

---

## 3. Flow 2: Merchant Storefront Builder (Protected Endpoints)

Use these endpoints to build the Page Builder / Customizer experience in the dashboard:

### A. Load Working Draft (or Active Fallback)
```http
GET /stores/:storeId/config/draft
Authorization: Bearer <token>
```
* **Response**:
  - If a draft exists: Returns draft with `"isDraft": true`.
  - If no draft exists yet (first time opening editor): Automatically falls back to the current published layout with `"isDraft": false` so the editor is pre-populated.

### B. Save / Auto-Save Working Draft
```http
POST /stores/:storeId/config/draft
Authorization: Bearer <token>
Content-Type: application/json

{
  "schemaVersion": "1.0.0",
  "contentJson": {
    "meta": { "name": "Rehan's Bakery" },
    "theme": { ... },
    "pages": [ ... ]
  }
}
```
* **Notes**:
  - Lenient validation: accepts work-in-progress drafts.
  - Updates the draft in-place without touching public Redis cache (visitors continue seeing the live published site).
  - Returns `status: "DRAFT"`.

### C. Publish Storefront (Go Live)
```http
POST /stores/:storeId/config/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "schemaVersion": "1.0.0",
  "contentJson": {
    "meta": { "name": "Rehan's Bakery" },
    "theme": { ... },
    "pages": [ ... ]
  }
}
```
* **Notes**:
  - Strictly validates against Zod schema (`StoreConfigContentV1Schema`). Throws `400 Bad Request` with field validation errors if invalid.
  - In an atomic transaction: promotes content to `ACTIVE` (increments version), demotes old `ACTIVE` to `BACKUP`, and cleans up the working `DRAFT`.
  - Invalidates Redis cache `store:config:<storeId>`.

### D. Revision History & Rollbacks
- `GET /stores/:storeId/config/history`: Lists previous published versions.
- `POST /stores/:storeId/config/rollback`:
  ```json
  { "targetVersion": 1 }
  ```
  Restores version 1 as a new forward-only published revision.

---

## 4. Local Development Setup

1. Start PostgreSQL (port 5435) & Redis (port 6379):
   ```bash
   docker compose up -d
   ```
2. Backend startup:
   ```bash
   cd backend
   npm run dev
   ```
