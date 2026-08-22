## High level relationships

```
User
└── Store
├── Products ── Inventory
├── Categories ── ProductCategories ── Products
├── Customers ── Cart ── CartItems ── Products
├── Orders ── OrderItems ── Products
│        └── Payments
├── FlashSales ── Reservations
└── StoreConfigs (JSONB versions)
```
