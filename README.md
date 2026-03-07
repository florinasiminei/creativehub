# cabn.ro

Next.js (App Router) project for listings + attractions, using Supabase for data and Cloudflare R2 for images.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main scripts

```bash
npm run dev
npm run build
npm run lint
```

R2 maintenance:

```bash
npm run r2:variants:cards
npm run r2:variants:cards:dry
npm run r2:cache-control:fix
npm run r2:cache-control:fix:dry
```

## Environment variables

Set values in `.env`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INVITE_TOKEN`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`
- `R2_ENDPOINT` (optional)

## Notes

- SQL migrations are in `db/`.
- Local migration reports are ignored via `migration-reports/`.
- Image uploads use signed URL flow (`/api/listing-upload-sign` + `/api/listing-upload-complete`).
