# Deploy checklist (Railway)

## Railway project

- Project: **Consultancy Management** (`82c48fa4-4d69-4d89-bd7b-b3b5ec047cdc`)
- App service: **Consultancy** → https://consultancy-production-9720.up.railway.app
- Postgres: **Postgres-MC1Y** → injects `DATABASE_URL`
- Custom domain: `qengineering.in` / `www.qengineering.in`

## App environment (Consultancy service)

| Name | Notes |
|------|--------|
| `DATABASE_URL` | From Postgres-MC1Y plugin |
| `SESSION_SECRET` | ≥ 32 characters (iron-session) |
| `S3_ENDPOINT` / `S3_REGION` | Railway Bucket / MinIO / AWS |
| `S3_DOCUMENTS_*` or `DOCUMENTS_S3_*` | Documents bucket + keys |
| `S3_IS_CODE_*` (or `IS_CODE_DOCUMENTS_S3_*`) | IS Code documents bucket + keys |
| `SUPER_ADMIN_EMAIL` | e.g. `info@qengineering.in` |
| `RESEND_API_KEY` | Resend API key (outbound @qengineering.in) |
| `RESEND_FROM_EMAIL` | Default from, e.g. `info@qengineering.in` |
| `RESEND_FROM_NAME` | Display name, e.g. `Q Engineering` |
| `RESEND_FROM_DOMAIN` | Verified domain, e.g. `qengineering.in` |

Optional AI / Maps keys: see [`.env.example`](.env.example).

**Email:** Inbox = Zoho IMAP (per-account). Outbound for `@qengineering.in` = Resend API when `RESEND_API_KEY` is set.

## Migrations

```bash
npm run migrate
```

Applies SQL under `Backend/db/migrations/` to `DATABASE_URL`. Run once per environment after deploy or as a release command.

## DNS for `qengineering.in`

1. **Root `@`**: CNAME → Railway Domains target (e.g. `6k0gemlm.up.railway.app`)
2. **TXT `_railway-verify`**: value from Railway Domains UI
3. **`www`**: CNAME → Railway www target

SSL activates after DNS propagates.

## Super admin

- Email: value of `SUPER_ADMIN_EMAIL` (default `info@qengineering.in`)
- That account always receives full admin access in the dashboard
