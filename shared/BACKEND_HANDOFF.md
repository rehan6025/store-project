# Sellvia — Backend Handoff Guide

Base URL: `http://localhost:3003` (or configured `PORT`).

---

## 1. Merchant Authentication (Dashboard)
All merchant dashboard endpoints require the merchant JWT token:
```http
Authorization: Bearer <merchant_jwt_token>
```

- `POST /auth/register`: `{ email, password }` $\rightarrow$ `{ accessToken, user }`
- `POST /auth/login`: `{ email, password }` $\rightarrow$ `{ accessToken, user }`
- `GET /auth/me`: Profile of current logged-in merchant.

---

## 2. Flow 1: Storefront Rendering (Public Endpoints)

Use these endpoints to render public-facing storefronts:

### A. Resolve Domain / Hostname
```http
GET /domains/resolve?hostname=rehan-bakery.sellvia.com
```
* **Response**: `{ storeId: 1, storeSlug: "rehan-bakery", storeName: "Rehan's Bakery", hostname: "..." }`

### B. Fetch Published Store Configuration
```http
GET /storefront/:slug/config
# or
GET /stores/:storeId/config
```
* Returns active JSON layout (colors, fonts, sections). Cached in Redis for sub-5ms response.

### C. Fetch Store Products
```http
GET /stores/:storeId/products
```

---

## 3. Flow 2: Merchant Storefront Builder (Protected)

Use these endpoints for the Store Builder / Customizer in the dashboard:

### A. Load Working Draft (or Active Fallback)
```http
GET /stores/:storeId/config/draft
Authorization: Bearer <merchant_token>
```
* If draft exists $\rightarrow$ returns draft with `"isDraft": true`.
* If no draft yet $\rightarrow$ falls back to live published layout with `"isDraft": false` so the editor is never blank.

### B. Save / Auto-Save Draft
```http
POST /stores/:storeId/config/draft
Authorization: Bearer <merchant_token>
Content-Type: application/json

{
  "schemaVersion": "1.0.0",
  "contentJson": { "meta": { ... }, "theme": { ... }, "pages": [ ... ] }
}
```
* Lenient: saves work-in-progress without busting public visitor cache.

### C. Publish Storefront (Go Live)
```http
POST /stores/:storeId/config/publish
Authorization: Bearer <merchant_token>
Content-Type: application/json

{
  "schemaVersion": "1.0.0",
  "contentJson": { ... }
}
```
* Validates Zod schema, publishes new version, cleans up draft, and busts Redis cache.

### D. History & Rollbacks
- `GET /stores/:storeId/config/history`: Lists previous revisions.
- `POST /stores/:storeId/config/rollback`: `{ "targetVersion": 1 }` restores a past version.

---

## 4. Flow 3: Shopper Auth, Carts, Checkout & Payments

All customer endpoints require the **Customer JWT token** in the header:
```http
Authorization: Bearer <customer_jwt_token>
```

### A. Customer Auth (Per Store)
Customer accounts are scoped to each store.
- **Register**:
  ```http
  POST /stores/:storeId/customers
  Content-Type: application/json

  { "name": "Alice", "email": "alice@gmail.com", "phone": "9876543210", "address": "123 Main St", "password": "password123" }
  ```
  Returns: `{ accessToken, customer: { id, storeId, name, email } }`

- **Login**:
  ```http
  POST /stores/:storeId/customers/login
  Content-Type: application/json

  { "email": "alice@gmail.com", "password": "password123" }
  ```
  Returns: `{ accessToken, customer: { id, storeId, name, email } }`

- **My Profile**:
  ```http
  GET /stores/:storeId/customers/me
  Authorization: Bearer <customer_token>
  ```

### B. Shopping Cart
- `GET /stores/:storeId/cart`: Gets the customer's current cart and items.
- `POST /stores/:storeId/cart/items`: Adds item to cart:
  ```json
  { "productId": 1, "quantity": 2 }
  ```
- `PATCH /stores/:storeId/cart/items/:itemId`: Updates item quantity:
  ```json
  { "quantity": 3 }
  ```
- `DELETE /stores/:storeId/cart/items/:itemId`: Removes item.
- `DELETE /stores/:storeId/cart`: Clears the whole cart.

### C. Checkout (Cart to Order)
Converts cart to an order, reserves physical stock, and empties the cart:
```http
POST /stores/:storeId/orders/checkout
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "fulfillmentType": "DELIVERY", // or "PICKUP"
  "deliveryAddress": "123 Main St"
}
```
* **Response**: Order object with `status: "PENDING"`, `totalAmount`, and reserved items.
* **15-Minute Payment Window**: The customer has 15 minutes to pay before reserved stock is released.

- `GET /stores/:storeId/orders/my-orders`: Lists the customer's past orders.
- `GET /stores/:storeId/orders/:orderId`: Gets details of a single order.

### D. Payments (With Retries & Expiration)
- **Submit Payment**:
  ```http
  POST /stores/:storeId/payments
  Authorization: Bearer <customer_token>
  Content-Type: application/json

  {
    "orderId": 42,
    "amount": 500,
    "method": "CARD" // Use "FAIL_TEST" to test card declines
  }
  ```
  - **Success**: Returns `orderStatus: "CONFIRMED"`, `success: true`.
  - **Payment Failed (e.g. Card Declined)**: Returns `orderStatus: "PENDING"`, `success: false`, `failureReason: "Card declined"`. The order is **not** cancelled—the customer can immediately retry with another card or UPI!
  - **Expired (After 15 Mins)**: Throws `400 Bad Request`, cancels the order, and automatically puts the reserved stock back on the shelf.

- **Payment Attempt History**:
  ```http
  GET /stores/:storeId/orders/:orderId/payments
  ```
  Lists all payment attempts for that order (useful for showing retry logs).

- **Webhook Callback (External Gateways)**:
  ```http
  POST /stores/:storeId/payments/webhook/:provider
  Header: x-webhook-signature: <sig>

  { "event": "payment.succeeded", "orderId": 42, "providerPaymentId": "ch_123" }
  ```
  Asynchronously marks the order `CONFIRMED` idempotently.

---

## 5. Local Setup Quick Commands

1. Start Postgres (port 5435) & Redis (port 6379):
   ```bash
   docker compose up -d
   ```
2. Run backend:
   ```bash
   cd backend
   npm run dev
   ```
3. Run tests:
   ```bash
   cd backend
   npm run test:unit
   ```
