# AGENTS.md - Coding agent instructions for this repo

This file is the primary, up-to-date guidance for automation. The
`.github/copilot-instructions.md` file still contains useful context; treat it
as supplemental guidance when it doesn't conflict with this file.

## Project overview
- Framework: Next.js (App Router)
- Styling: Tailwind CSS
- Database: Supabase

## Repo structure
- `app/` routes and layouts (App Router conventions)
- `components/` reusable UI
- `hooks/` custom React hooks
- `lib/` utilities, types, Supabase clients
- `public/` static assets

## Conventions
- Default to Server Components; add `"use client"` only when required.
- Keep diffs minimal and focused; do not reformat unrelated code.
- Add imports at the top without reordering unrelated imports.
- Use types from `lib/types.ts` when available.
- Prefer existing utilities in `lib/` before adding new ones.
- Preserve UTF-8 encoding for all files when editing/creating content.

## Data access
- Client: `lib/supabaseClient.ts`
- Admin/server: `lib/supabaseAdmin.ts`

## Scripts
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Agent behavior
- Always read the latest file contents before editing.
- Do not introduce new dependencies unless requested.
- Follow the existing UI patterns and visual language.
