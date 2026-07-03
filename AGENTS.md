<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Stack: Next.js 16 (App Router, Turbopack) + Supabase (Auth/Postgres/Storage). Package manager is **npm** (`package-lock.json`). Node 20+ (VM ships v22, works fine). Scripts live in `package.json` (`dev`, `build`, `start`, `lint`, `supabase`). There is **no automated test framework** — the only script is the manual IMAP checker `node scripts/test-imap.mjs` (needs `SUPABASE_SERVICE_ROLE_KEY` + an `email_accounts` row).

Environment: copy `.env.example` → `.env.local` (the update script does this only if `.env.local` is missing). `.env.example` ships with a **working live hosted Supabase URL + anon key**, so auth/login and all data reads work out of the box against the hosted project — no local Postgres/Docker/`supabase start` needed.

Gotchas:
- `next build` and `next dev` share the `.next/` dir. If you run `npm run build` while the dev server is up, restart `npm run dev` afterward (delete `.next/` if it acts stale).
- `npm run lint` currently reports pre-existing errors/warnings in the repo (unrelated to setup) — a clean exit is not expected. Do not treat those as environment breakage.
- **Dashboard (`/dashboard/*`) is the core product and requires an authenticated staff login.** Self-signup is disabled (`/signup` is informational); accounts are created by an admin under Settings → User Management, which itself needs a real `SUPABASE_SERVICE_ROLE_KEY` (the `.env.example` value is a placeholder) plus an already-logged-in admin. To test the dashboard you need existing staff credentials; unauthenticated `/dashboard` correctly 307-redirects to `/login`.
- AI features (public QE Assistant chat `/api/qe-chat`, email AI draft, regulatory-update summaries) are feature-gated behind `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` (+ optional `QE_AI_PROVIDER`). Without a real key the QE chat returns a graceful `503 {fallback:true}` and the widget shows a fallback message.
- This Supabase project appears to hold real/production consultancy data — avoid creating throwaway records against it.
