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

## 5. Flow 4: Flash Sales & High-Concurrency Reservation Engine

High-velocity flash sales use an in-memory Redis Lua script for sub-2ms admission control (<1ms) to eliminate PostgreSQL row-lock contention and overselling, backed by BullMQ workers for asynchronous persistence and active delayed restock compensation.

### A. Merchant Flash Sale Management (Protected)
Requires merchant JWT: `Authorization: Bearer <merchant_jwt_token>`

- **Create a Flash Sale**:
  ```http
  POST /stores/:storeId/flash-sales
  Authorization: Bearer <merchant_token>
  Content-Type: application/json

  {
    "productId": 10,
    "startsAt": "2026-11-20T12:00:00.000Z",
    "endsAt": "2026-11-20T14:00:00.000Z",
    "salePrice": 299,
    "stockLimit": 50
  }
  ```
  - **Validations**: `startsAt < endsAt`, `endsAt` in the future, `salePrice < product.price`, `stockLimit <= available warehouse stock`.
  - **Pre-warming**: If the sale is starting immediately, the server automatically pre-warms the Redis stock key (`flashsale:stock:<id> = stockLimit`).

- **List Store's Flash Sales**:
  ```http
  GET /stores/:storeId/flash-sales
  Authorization: Bearer <merchant_token>
  ```

---

### B. Storefront Flash Sales (Public)

- **Get Currently Active Flash Sales**:
  ```http
  GET /stores/:storeId/flash-sales/active
  ```
  - Cached in Redis with a 30-second TTL for sub-5ms responses during traffic spikes.

---

### C. Shopper Atomic Reservation (Protected)
Requires customer JWT: `Authorization: Bearer <customer_jwt_token>`

- **Reserve Flash Sale Stock**:
  ```http
  POST /stores/:storeId/flash-sales/:saleId/reserve
  Authorization: Bearer <customer_token>
  Content-Type: application/json

  {
    "quantity": 1
  }
  ```
  - **Success (`201 Created`)**: Returned in ~15ms!
    ```json
    {
      "status": "RESERVED",
      "reservationToken": "res_84d7a9b0-...",
      "flashSaleId": 10,
      "quantity": 1,
      "expiresInSeconds": 600,
      "expiresAt": "2026-11-20T12:10:00.000Z"
    }
    ```
  - **Sold Out (`400 Bad Request`)**: Returned in < 2ms without querying PostgreSQL:
    ```json
    {
      "statusCode": 400,
      "message": "Sold out or insufficient stock"
    }
    ```

---

### D. Frontend UX & Payment Flow for Flash Sales
1. Shopper clicks **"Claim Deal"** on the flash sale item.
2. The endpoint returns `201 RESERVED` with `reservationToken` in 15ms.
3. The frontend immediately transitions the shopper to the checkout/payment page with a **10:00 countdown timer**.
4. In the background, BullMQ asynchronously persists the `Reservation` row to PostgreSQL in ~50ms.
5. **Active Delayed Restocking**:
   - If the customer completes payment within 10 minutes $\rightarrow$ status becomes `PURCHASED`.
   - If the customer abandons checkout $\rightarrow$ at minute 10, the BullMQ worker automatically marks the reservation `EXPIRED` and atomically restores stock in Redis via `INCRBY`.

---

## 6. Active Background Expiration Workers (BullMQ)

To protect physical store inventory from checkout hoarding (Issue #7):
1. **Normal Orders (`order-expirations`)**: When a customer checks out, a 15-minute delayed BullMQ job is scheduled. If the order is still `PENDING` after 15 minutes, the worker automatically cancels the order and increments the physical product `stockCount` in PostgreSQL.
2. **Flash Sales (`flash-sale-expirations`)**: When a reservation is created, a 10-minute delayed job is scheduled. If still `RESERVED` after 10 minutes, the worker marks it `EXPIRED` and restores Redis stock via `INCRBY`.

---

## 7. Local Setup Quick Commands

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
