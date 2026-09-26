# StockSense — Inventory Management System

StockSense tracks stock per warehouse location. Stock only changes through four documents — **Receipts**, **Deliveries**, **Internal Transfers** and **Inventory Adjustments** — and every change is written to an append-only **Stock Ledger**.

- **Frontend:** React + TypeScript (Vite) — `frontend/`
- **Backend:** NestJS + Prisma — `backend/`
- **Database:** PostgreSQL 17 in Docker — `docker-compose.yml`, schema in `database/migrations/`

---

## What you need

- **Node.js 22** (includes npm)
- **Docker Desktop** (running)

---

## Run it — first time (3 steps)

### 1. Start the database

From the project folder:

```bash
cp .env.example .env
```

Open `.env` and replace `change-me` with a password of your choice (in **both** `POSTGRES_PASSWORD` and `DATABASE_URL`). Then:

```bash
docker compose up -d
```

### 2. Start the backend (API)

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set:

- `DATABASE_URL` — the same line as in the root `.env`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET` — any long random strings (three different ones). To generate one:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

Then:

```bash
npm install
npm run db:migrate
npm run start:dev
```

The API runs at **http://localhost:4100/api** (interactive docs: **http://localhost:4100/api/docs**). Leave this terminal open.

### 3. Start the frontend (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — you'll see the landing page.

> On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp .env.example .env`.

---

## Run it — every next time

```bash
docker compose up -d                 # project folder
cd backend  && npm run start:dev     # terminal 1
cd frontend && npm run dev           # terminal 2
```

Then open **http://localhost:5173**.

---

## Using the app

1. **Landing page** → **Get Started** to create an account, or **Sign In**.
2. **The first account ever created becomes the Inventory Manager.** Every later sign-up is **Warehouse Staff**.
   - Manager: everything, including creating warehouses/locations, activating/deactivating records and **applying** stock adjustments.
   - Staff: day-to-day work — receipts, transfers, deliveries (pick / pack / validate), counting stock (creating adjustments).
3. Typical flow: **Warehouse** (warehouse + locations) → **Products** (category + product) → **Receipts** (stock in) → **Transfers** (move between locations) → **Deliveries** (stock out) → **Adjustments** (physical count) → **Move History** (full audit trail) → **Dashboard** (live KPIs and low-stock alerts).
4. **Forgot password:** email sending is off by default, so the 6-digit code is printed in the **backend terminal**. To send real emails, fill in the `SMTP_*` settings in `backend/.env`.

---

## Useful commands

| Where | Command | What it does |
|---|---|---|
| project folder | `docker compose up -d` / `docker compose down` | start / stop the database (data is kept) |
| `backend/` | `npm run start:dev` | API with auto-reload |
| `backend/` | `npm run db:migrate` | apply new database migrations |
| `backend/` | `npm run test:e2e` | backend tests (use a temporary `stocksense_test` database, never your data) |
| `backend/` | `npm run build` then `npm run start:prod` | production build of the API |
| `frontend/` | `npm run dev` | web app with hot reload |
| `frontend/` | `npm run build` then `npm run preview` | production build of the web app |

---

## Troubleshooting

- **`docker compose up` fails / backend can't connect** — make sure Docker Desktop is running and the password is identical in `.env` and `backend/.env`.
- **Port already in use** — the app uses **5432** (database), **4100** (API) and **5173** (web). Stop whatever uses the port, or change `POSTGRES_PORT` in `.env` (and the port in both `DATABASE_URL`s) / `PORT` in `backend/.env`.
- **Sign-in shows "Something went wrong on our side" or "Unable to reach the StockSense server"** — the backend isn't running (or crashed); start it with `npm run start:dev` in `backend/` and check that terminal for errors.
- **Start completely fresh (deletes all data)** — `docker compose down -v`, then `docker compose up -d` and `npm run db:migrate` again.

---

## Project structure

```
StockSense/
├── docker-compose.yml        PostgreSQL
├── database/migrations/      SQL schema (applied by `npm run db:migrate`)
├── backend/                  NestJS API (auth, products, warehouses, stock, documents, ledger, dashboard)
├── frontend/                 React app (landing, sign-in, dashboard and all modules)
└── qa-report/                End-to-end browser test report and screenshots
```
