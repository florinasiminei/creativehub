# Supabase Storage & Upload setup

This document explains the minimal steps to enable image uploads from the Admin page in this project and the required environment variables.

1. Create storage bucket
   - In Supabase dashboard:
     - Storage → Buckets → New bucket
     - Name: `listing-images`
     - Access: Public (if you want immediate public URLs). If you prefer private, you'll need a server route that returns signed URLs or use our `/api/listing-upload` to store and manage access.

2. Environment variables
   - In `.env.local` for local dev, add:
     - NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
     - NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
     - SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

   - The `SUPABASE_SERVICE_ROLE_KEY` must be treated as a secret; add it as a server environment secret on your hosting (Vercel/Netlify) and not exposed to client-side code.

3. SQL migrations
   - Run the migration files in `db/migrations` in order:
     - `001_add_created_at_default_listing_images.sql` — ensures a default for `created_at`.
     - `002_set_null_created_at_listing_images.sql` — populates any NULL `created_at` rows with `now()`.

   - You can run these from Supabase Dashboard (SQL editor) or using a migration tool.

4. API route `/api/listing-upload`
   - This server endpoint handles uploads and inserts rows in `listing_images`. It uses `SUPABASE_SERVICE_ROLE_KEY` to authenticate.
   - Ensure the server runtime environment has `SUPABASE_SERVICE_ROLE_KEY` set.

   - Note: If your Supabase project serves images from `*.supabase.co`, add the Supabase host(s) to Next.js image `remotePatterns` to allow Next to optimize remote images. Example `next.config.js`:

```js
module.exports = {
   images: {
      remotePatterns: [
         {
            protocol: 'https',
            hostname: '**.supabase.co',
            pathname: '/**',
         },
      ],
   },
};
```

   - Drafts & edit access
      - After you add a new property it will be created as a draft (field `is_published = false`). You are redirected to `/edit-property/<id>` where you can edit the draft details.
      - To access a draft directly, visit `https://<your-site>/edit-property/<listing-id>`.
      - Deleting an image uses `/api/listing-images/delete` and requires `SUPABASE_SERVICE_ROLE_KEY` (server). It removes the database row and deletes the storage asset if it detects the default Supabase public URL path pattern.
      - Creating a draft from the Add Property page now uses a server endpoint `/api/listing-create` (uses the service role key), so client RLS policies won't block you. This endpoint returns the `id` and allows the subsequent upload endpoint to attach images securely.
      - You can also delete an entire draft from the new Drafts page; it calls the server endpoint `/api/listing-delete` and removes the listing and any images from Storage before deleting the row.

Feedback & Security
- If you need stricter security (no public bucket), keep `listing-images` as private and use `/api/listing-upload` to make images private or to generate signed URLs on demand.
- Consider adding authentication to the endpoint (e.g., only allow logged in admin users to call it).

If you want, I can also implement an authenticated server route that checks for a simple admin password or Token before uploading.
