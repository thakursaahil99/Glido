# Glido

A local-commerce super app — **Glido Food** is fully built and working end-to-end in this repo
(browse → cart → checkout → pay → track → admin-manage). Glido Grocery and Glido Cab are
placeholder pages sharing the same brand/account, ready to be built as the next modules on top of
this same architecture.

This is a **demo/portfolio build**, scoped down from a full "Blinkit + Swiggy + Uber" super-app
spec to one real, working vertical slice rather than many unfinished ones. Everything below is
real: a real PostgreSQL database, real auth, real order lifecycle, real admin control — running
entirely on free/local infrastructure (no paid accounts required).

## What's built

- **Public website** (Next.js): home, restaurant browse/search, restaurant + menu detail, cart,
  checkout, order tracking (live via WebSocket), order history, profile/addresses, OTP login,
  static info pages (About, Contact, Terms, Privacy, Refund Policy, Help Center, Partner/Driver
  landing pages).
- **Admin panel** (`/admin`): dashboard with live stats, restaurant approval + menu management,
  order management with status-transition rules, user management (block/unblock), coupons,
  homepage banner CMS.
- **Backend API** (NestJS + Prisma): OTP auth with JWT access/refresh tokens, restaurants & menu,
  orders with server-side pricing/coupon/tax calculation and a validated status state machine,
  Razorpay payments (test mode, with an automatic no-account-needed mock fallback), wallet/review
  data model, Socket.IO realtime order updates, Swagger API docs.
- **Database**: PostgreSQL via Prisma, with real DB-level `enum` types (order status, payment
  status, roles, etc.) plus indexes and foreign-key constraints. Prisma schema models the full
  Food domain plus shared platform entities (users, wallet, coupons, reviews, banners, audit log)
  so Grocery/Cab can be added without a redesign.

## What's not built (next steps)

Grocery and Cab modules, the Flutter driver/restaurant-partner apps, a separate restaurant-partner
portal (admin manages restaurants directly for now), granular RBAC roles (only ADMIN vs CUSTOMER
today), SMS delivery (OTP is logged to the API console instead — free, no SMS provider needed),
and the CI/deployment pipeline. The database schema and module boundaries are designed so these
can be added incrementally.

## Stack

| Layer | Tech |
|---|---|
| Web | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| API | NestJS 10, TypeScript, Socket.IO |
| DB | PostgreSQL via Prisma ORM |
| Auth | OTP + JWT access/refresh tokens |
| Payments | Razorpay (test mode) with a zero-config mock fallback |
| Monorepo | npm workspaces (`apps/api`, `apps/web`, `packages/shared`) |

## Project structure

```
apps/
  api/             NestJS backend
    prisma/        schema.prisma, migrations, seed.ts
    src/
      auth/        OTP + JWT auth
      users/       profile, addresses, admin user management
      cities/      city management
      restaurants/ restaurants + menu categories/items (public + admin)
      coupons/     coupon CRUD + validation
      orders/      order lifecycle, status state machine
      payments/    Razorpay integration + mock fallback
      reviews/     order reviews → restaurant rating aggregation
      admin/       dashboard stats + banner CMS
      realtime/    Socket.IO gateway
  web/             Next.js app
    src/app/(site) public site (home, food, cart, checkout, orders, profile, login, info pages)
    src/app/admin  admin panel (dashboard, restaurants, orders, users, coupons, banners)
    src/lib        API client, auth/cart/toast context, socket client
packages/
  shared/          shared TS types/constants used by both api and web
```

## Getting started

Requirements: Node.js 18+, npm, and a running **PostgreSQL** server. No Docker or external
accounts needed — a local Postgres install (or `docker run -e POSTGRES_PASSWORD=postgres -p
5432:5432 postgres` if you have Docker) is enough. This repo was developed against a local
PostgreSQL 17 instance running as a Windows service.

```bash
# 1. Install all workspace dependencies (run once, from the repo root)
npm install

# 2. Create the database and apply the schema
#    (createdb requires a Postgres superuser — adjust user/password to match your install)
createdb -h localhost -U postgres glido
cd apps/api
npx prisma migrate dev --name init_postgres
npm run prisma:seed                  # loads demo restaurants, menus, coupons, admin + customer

# 3. Start the API (from repo root, in one terminal)
npm run dev:api        # http://localhost:4000/api  (Swagger docs at /api/docs)

# 4. Start the web app (in another terminal)
npm run dev:web        # http://localhost:3000
```

### Demo accounts (OTP login — no password)

Login uses a one-time code. In this demo, `OTP_DELIVERY=console` (the default), so **the OTP is
printed to the `apps/api` server console/log** instead of being sent by SMS or email — no paid
provider needed to try the app.

- **Admin**: `admin@glido.app` → log in at `/admin/login`
- **Customer**: `customer@glido.app` → log in at `/login` (has a saved address + ₹250 wallet
  balance pre-seeded)
- Any other email/phone you enter will auto-create a new customer account on first OTP verify.
- Demo coupons: `GLIDO50` (50% off, capped ₹100, min order ₹150) and `FLAT50` (₹50 off, min order
  ₹200).

## Environment variables

### `apps/api/.env` (copy from `.env.example`)

| Variable | Purpose | Default / free option |
|---|---|---|
| `DATABASE_URL` | Prisma datasource | `postgresql://postgres:postgres@localhost:5432/glido?schema=public` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets | any random string for dev |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes | `15m` / `30d` |
| `PORT` | API port | `4000` |
| `WEB_ORIGIN` | Allowed CORS origin(s) | `http://localhost:3000` |
| `OTP_DELIVERY` | `console` (log OTP) or `email` (send via SMTP) | `console` — free, no signup |
| `SMTP_*` | Only used when `OTP_DELIVERY=email` | e.g. a free Gmail app password |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay **test mode** keys | leave blank → orders use the built-in mock-payment flow instead (still exercises the full checkout → paid → tracked flow, just skips the real Razorpay checkout widget) |

Get free Razorpay test keys (optional) at https://dashboard.razorpay.com/app/keys → toggle to
**Test Mode**. Without them, `ONLINE` payment orders still work end-to-end via the mock path.

### `apps/web/.env.local` (copy from `.env.example`)

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend REST base URL | `http://localhost:4000/api` |
| `NEXT_PUBLIC_SOCKET_URL` | Backend Socket.IO base URL | `http://localhost:4000` |

## Using a hosted Postgres instead of local

To point at a free hosted Postgres (e.g. [Neon](https://neon.tech) or
[Supabase](https://supabase.com)) instead of a local install, just set `DATABASE_URL` in
`apps/api/.env` to that connection string, then run `npx prisma migrate dev --name init_postgres`
and `npm run prisma:seed` from `apps/api` — nothing else changes.

## API documentation

With the API running, open **http://localhost:4000/api/docs** for interactive Swagger docs
covering every endpoint (auth, users, restaurants, orders, payments, coupons, reviews, admin).

## Order lifecycle (state machine)

`PENDING → ACCEPTED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED`, with `CANCELLED` allowed
from `PENDING`/`ACCEPTED`/`PREPARING` and `REFUNDED` following a cancelled, paid order. Invalid
transitions are rejected server-side (`apps/api/src/orders/orders.service.ts`) regardless of what
the UI sends — the admin UI only exposes the valid next steps, but the API is the real guard.

## Deployment notes

### Docker (local or any container host)

`docker-compose.yml` at the repo root builds and runs Postgres + the API + the web app together:

```bash
docker compose up --build
```

- API → http://localhost:4000/api, Web → http://localhost:3000
- The API image (`apps/api/Dockerfile`) runs `prisma migrate deploy` automatically on container
  start (`apps/api/docker-entrypoint.sh`) before booting the server — no manual migration step.
- The web image (`apps/web/Dockerfile`) uses Next.js's `output: "standalone"` build; pass
  `NEXT_PUBLIC_API_URL` as a build arg if the API isn't at `localhost:4000` (see `docker-compose.yml`).
- Override `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `WEB_ORIGIN` via a `.env` file next to
  `docker-compose.yml` (compose reads it automatically) before running this anywhere but locally.
- These images build fine on paper but haven't been verified with a real `docker build` in this
  environment (no Docker available here) — smoke-test with `docker compose up --build` before
  relying on them.

### Free-tier hosting (no Docker required)

- **API**: any host that runs a Node process against a Dockerfile or a `npm run build && npm start`
  buildpack (Render, Railway, Fly.io all have free/low-cost tiers) — point `DATABASE_URL` at a
  managed Postgres instance ([Neon](https://neon.tech) or [Supabase](https://supabase.com) both
  have free tiers), and set real `JWT_*` secrets, `OTP_DELIVERY=email` (or a real SMS provider you
  wire in), and Razorpay live keys.
- **Web**: deploy `apps/web` to any Next.js host (Vercel's free tier works well) with
  `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SOCKET_URL` pointed at the deployed API.
- **CORS**: set `WEB_ORIGIN` on the API to the deployed web origin(s).
- Realtime uses Socket.IO's default in-memory adapter — fine for a single API instance; add the
  Redis adapter before scaling the API horizontally.

### CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: installs dependencies, generates the
Prisma client, runs the API's Jest test suite, and builds both the API and the web app. It needs
this repo pushed to GitHub to actually run — `git init` hasn't been done yet in this project.
