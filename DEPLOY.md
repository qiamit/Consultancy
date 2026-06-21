# Deploy checklist (Vercel + Supabase)

## Supabase (once per environment)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Run migration SQL from `supabase/migrations/20250503120000_initial_schema.sql` in **SQL Editor**, or use Supabase CLI linked to this repo.
3. **Authentication → URL configuration**: add your production URL and `http://localhost:3000` to **Site URL** and **Redirect URLs** (include `https://your-domain.com/auth/callback`).
4. Copy **Project URL** and **anon** key to Vercel environment variables.

## Vercel

1. **New Project → Import** your GitHub repo (`qiamit/Consultancy` or your fork).
2. Environment variables:

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase → Settings → API (anon public) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only — User Management |
   | `SUPER_ADMIN_EMAIL` | e.g. `qicoding1@gmail.com` |

   **Important:** The browser login uses **`NEXT_PUBLIC_*`** variables only. Updating `SUPABASE_URL` / `SUPABASE_ANON_KEY` (Vercel Supabase integration names) is **not enough** — you must set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then **redeploy**. After changing env vars, verify the live bundle no longer references an old project ref (e.g. open DevTools → Network on `/login`).

3. Deploy. Every push to the connected branch triggers a new deployment.

## GitHub ↔ Supabase

- **Code**: migrations and app live in GitHub.
- **Database**: Supabase does not auto-sync from GitHub unless you add a CI step (CLI `db push`, GitHub integration, or manual SQL). Apply migrations to production after reviewing them.

## GitHub remote

```bash
git remote add origin https://github.com/qiamit/Consultancy.git
git branch -M main
git push -u origin main
```

Use your preferred branch name if `main` is not the default on the remote.
