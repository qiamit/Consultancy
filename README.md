# Technical Consultancy — Web App

Next.js 16 (App Router) + Railway Postgres + S3-compatible storage for BIS licensing, ISO / accreditation, testing, calibration, client, and finance workflows.

## Prerequisites

- Node.js 20+
- Railway project with Postgres (`Postgres-MC1Y` / `DATABASE_URL`) and an S3-compatible bucket

## Local setup

1. Clone this repository.

2. Copy env files (Next loads from `Frontend/`):

   ```bash
   cp .env.example .env.local
   cp .env.example Frontend/.env.local
   ```

3. Set Railway-native variables in `.env.local`:

   | Variable | Purpose |
   |----------|---------|
   | `DATABASE_URL` | Postgres connection string (Railway Postgres plugin) |
   | `SESSION_SECRET` | Cookie signing (≥ 32 characters) |
   | `S3_*` / `DOCUMENTS_S3_*` | Object storage (documents + IS Code buckets) |
   | `SUPER_ADMIN_EMAIL` | Account with full admin access |
   | `RESEND_API_KEY` | Outbound email for `@qengineering.in` (Resend) |
   | `RESEND_FROM_EMAIL` | Default from address (e.g. `info@qengineering.in`) |

4. Apply migrations:

   ```bash
   npm run migrate
   ```

5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000). Create the first staff user via User Management after signing in as the super admin (or seed that email in `app_users`).

## Deploy on Railway

See [`DEPLOY.md`](DEPLOY.md).

1. Set the same env vars on the **Consultancy** service.
2. Run `npm run migrate` against production `DATABASE_URL` (release command or one-off).
3. Deploy from repo root (`railway up` / GitHub). Build: `npm run build` → `next build Frontend`.

Production app URL: https://qengineering.in (also https://consultancy-production-9720.up.railway.app)

## Project layout

```text
Frontend/     Next.js UI — app routes, components, public assets
Backend/      Server domain — actions, modules, shared utils, DB migrations
```

- [`Frontend/app/`](Frontend/app/) — Routes: marketing, auth, `/dashboard/*`, API routes
- [`Frontend/components/`](Frontend/components/) — React UI
- [`Backend/actions/`](Backend/actions/) — Server Actions
- [`Backend/db/`](Backend/db/) — Postgres pool, session auth, migrations
- [`Backend/modules/`](Backend/modules/) — Domain helpers (BIS, finance, email, print, …)
- [`Backend/shared/`](Backend/shared/) — Shared types, validation, constants

## License

Private — your consultancy use only unless you choose otherwise.
