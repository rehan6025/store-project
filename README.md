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

## 🏗️ Architecture

Sellvia uses a monorepo architecture:

```text
sellvia/
├── frontend/     # Storefront & dashboard
├── backend/      # NestJS API
├── shared/       # Shared types, schemas and contracts
└── package.json
```
