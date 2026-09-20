# Ops scripts (not part of the runtime app)

Keep these for admin / one-time data work. They are **not** required for Railway to run Consultancy Pro.

| Script | Purpose |
|--------|---------|
| `apply-migrations.cjs` | Apply `Backend/db/migrations/*` (`npm run migrate`) |
| `promote-admin.cjs` | Promote a user to admin |
| `verify-app-users.cjs` | Sanity-check `app_users` / profiles |
| `import-client-data-xlsx.cjs` | One-time Client Master Excel import |
| `import-is-code-data-xlsx.cjs` | One-time IS Code Excel import |
| `import-is-code-details-xlsx.cjs` | One-time IS Code details import |
| `import-license-details-xlsx.cjs` | One-time license details import |

Requires `DATABASE_URL` (and usually `.env.local`). Do not commit secrets or Excel dumps.
