# Supabase PostgreSQL Setup

Use Supabase as the PostgreSQL provider by filling the database URLs in each runtime `.env`.

## Recommended URLs

Use the Transaction Pooler connection for app runtime:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:6543/postgres?pgbouncer=true&connection_limit=1"
```

Use the Session Pooler connection for Prisma schema changes when your machine/network cannot reach Supabase IPv6 direct database hosts:

```env
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres?sslmode=require"
```

Supabase also shows a Direct connection like `db.<project-ref>.supabase.co:5432`. That host can be IPv6-only on some projects. If `Test-NetConnection db.<project-ref>.supabase.co -Port 5432` fails or Prisma prints only `Schema engine error`, use the Session Pooler URL instead.

Set both values in:

- `apps/api/.env`
- `apps/worker/.env`
- `apps/webhook/.env`

## Apply Schema

After the URLs are set:

```bash
npm run db:generate --workspace @omnichannel/database
npm run db:push --workspace @omnichannel/database
npm run db:seed --workspace @omnichannel/database
```

## Notes

- Keep Redis local or hosted separately; Supabase only replaces PostgreSQL here.
- If `db:push` fails with an IPv6/network error, use the Session Pooler URL shown in Supabase dashboard connection settings for `DIRECT_URL`.
- Do not commit real Supabase passwords.
