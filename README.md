# Technical Consultancy — Web App

Next.js 16 (App Router) + Supabase (Auth, Postgres, Storage) for running BIS licensing, ISO / accreditation, testing, calibration, client, and finance workflows.

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project

## Local setup

1. Clone this repository (or open this folder after cloning from GitHub).

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. In the Supabase Dashboard: **Project Settings → API**, copy **Project URL** and the **anon public** key into `.env.local`:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Apply the database schema. Either:

   - **SQL Editor**: paste and run the contents of [`supabase/migrations/20250503120000_initial_schema.sql`](supabase/migrations/20250503120000_initial_schema.sql), or  
   - **Supabase CLI**: link the project and run `supabase db push` (if you use CLI-managed migrations).

5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000). Use **Staff signup** to create the first user (ensure Email confirmations are disabled or confirm via mail for dev — **Authentication → Providers → Email** in Supabase).

## GitHub and Supabase

- **GitHub**: push this repo to your remote (e.g. `https://github.com/qiamit/Consultancy.git`).
- **Supabase**: database migrations live under [`supabase/migrations/`](supabase/migrations/). For production, apply the same SQL (or CLI migrations) to your hosted project.
- **Connecting CI/CD**: optional GitHub Action or deploy hook can run `supabase db push` with a service role; keep secrets in GitHub encrypted secrets only.

## Deploy on Vercel

1. Import the GitHub repository in [Vercel](https://vercel.com/).
2. Framework preset: **Next.js**.
3. Add the same environment variables as in `.env.local` (Production & Preview):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Deploy. Production URL will use your Supabase backend automatically.

## Project layout

- [`app/`](app/) — Routes: marketing home, `/login` / `/signup`, `/dashboard/*` modules.
- [`lib/supabase/`](lib/supabase/) — Browser and server Supabase clients + middleware session refresh.
- [`lib/actions/`](lib/actions/) — Server Actions for CRUD and uploads.
- [`supabase/migrations/`](supabase/migrations/) — Postgres schema, RLS, Storage bucket `documents`.

## License

Private — your consultancy use only unless you choose otherwise.
