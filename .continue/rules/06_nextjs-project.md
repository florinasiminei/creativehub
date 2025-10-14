description: Next.js conventions (App Router), client/server boundaries, imports, routing, metadata
Always applied

When working in this project (Next.js, App Router preferred):

1) Client vs Server
- Default to **Server Components**. Add `"use client"` only when using hooks/state/effects or browser-only APIs.
- Do not introduce `"use client"` at root layout/pages unless absolutely necessary.

2) Imports & primitives
- Use `next/link` instead of `<a>` for internal navigation.
- Use `next/image` for images; provide `alt`, and reasonable width/height or `fill`.
- Prefer dynamic imports for heavy client components: `const Comp = dynamic(() => import('...'), { ssr: false })`.

3) Routing & file structure (App Router)
- Pages live under `app/**/page.tsx`.
- Layouts under `app/**/layout.tsx`. Keep them server by default.
- API Route Handlers under `app/api/**/route.ts`: export named `GET`, `POST`, etc., returning `Response`/`NextResponse`.

4) Metadata
- Prefer `export const metadata` in `page.tsx`/`layout.tsx` for SEO basics (title, description).

5) TS/TSX quality
- Strongly type props and return types.
- Keep diffs minimal; do not reformat unrelated code.
- Maintain existing import order and aliases (e.g., `@/*` via `tsconfig.json` paths).

6) Edits
- Use `read_currently_open_file` or `read_file`, then `edit_existing_file` with a **concise fenced snippet** containing ONLY the changed section(s) and the correct file path in the fence header.
