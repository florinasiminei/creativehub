# AGENTS.md - Coding agent instructions for this repo

This file is the primary, up-to-date guidance for automation in this repository.

The `.github/copilot-instructions.md` file may contain useful supplemental context. Use it only when it does not conflict with this file. If there is any conflict, this file wins.

---

## Project overview

- Framework: Next.js with App Router
- Styling: Tailwind CSS
- Database/backend: Supabase
- Language/style: Follow the existing project conventions and preserve UTF-8 encoding for all files.

---

## Repo structure

- `app/` - routes, layouts, pages, server actions, App Router conventions
- `components/` - reusable UI components
- `hooks/` - custom React hooks
- `lib/` - utilities, types, Supabase clients, shared helpers
- `public/` - static assets
- `.github/copilot-instructions.md` - supplemental guidance only

---

## Core agent behavior

Work like a careful coding agent similar to Codex, but stay efficient with context.

- Always understand the relevant code before editing.
- Always read the latest contents of the directly relevant file before modifying it.
- Prefer small, targeted, easy-to-review changes.
- Do not make broad refactors unless explicitly requested.
- Do not change unrelated formatting.
- Do not reorder unrelated imports.
- Do not invent files, APIs, database fields, environment variables, routes, or business logic.
- Do not introduce new dependencies unless explicitly requested.
- Do not modify lockfiles unless explicitly requested.
- Preserve existing UI patterns, naming conventions, and visual language.
- Prefer existing utilities/components before creating new ones.
- Keep diffs minimal and focused.
- If the task is ambiguous, ask one short clarification question.
- If the change touches more than 3 files or changes architecture, write a plan first and wait for approval.

---

## Speed and minimal-context behavior

Be efficient. Do not over-analyze simple tasks.

For simple or clearly scoped tasks:

- Do not scan the whole repository.
- Do not inspect unrelated folders.
- Read only the file or files directly relevant to the request.
- If the user names a specific file, component, route, function, or text, start there.
- If the needed change is obvious after reading the relevant file, make the minimal edit without additional repository-wide searching.
- For obvious one-file edits, skip the formal plan and apply the minimal safe change.
- Keep explanations short unless the user asks for details.

For unclear or broader tasks:

- Use narrow searches with `rg`.
- Limit searches to likely folders such as `app/`, `components/`, `hooks/`, and `lib/`.
- Avoid broad searches from the repository root unless necessary.
- Do not perform exploratory searches just to be thorough.
- Search only when it helps complete the requested change.

---

## Next.js conventions

- Use App Router conventions.
- Default to Server Components.
- Add `"use client"` only when required for hooks, browser APIs, client-side state, or event handlers.
- Do not convert Server Components to Client Components unless necessary.
- Prefer server-side data fetching when possible.
- Keep route, layout, loading, error, and page files aligned with existing App Router structure.
- Do not move files or restructure routes unless explicitly requested.

### Image delivery

- Use pregenerated WebP variants stored in Cloudflare R2 for uploaded property and attraction photos.
- Keep `images.unoptimized: true` in `next.config.js`. Do not enable Vercel Image Optimization or generate `/_next/image` URLs.
- Use `components/R2Image.tsx` for responsive uploaded photos; it selects R2 files using `srcset` and `sizes`.
- Generate new variants at upload time, never on image requests. The existing-images command is `node scripts/generate-r2-card-variants.mjs --responsive` (add `--dry-run` to inspect).
- Preserve the `r2w` query parameter on new image URLs: it records the largest available variant. The backfill command also updates `lib/listingImageVariantLimits.json` for older images with fewer sizes; include that file when deploying.

---

## React and UI conventions

- Follow existing component patterns in `components/`.
- Reuse existing components before creating new ones.
- Keep component props simple and typed.
- Avoid unnecessary state.
- Avoid unnecessary effects.
- Prefer readable JSX over clever abstractions.
- Preserve Tailwind style conventions already used in the project.
- Do not redesign UI unless explicitly requested.
- Do not change unrelated spacing, colors, layout, or typography.

---

## TypeScript conventions

- Use types from `lib/types.ts` when available.
- Prefer explicit types when they improve clarity.
- Avoid `any` unless there is no reasonable alternative.
- Do not create duplicate types if an existing type is available.
- Keep imports at the top.
- Add new imports without reordering unrelated imports.
- Do not perform large type refactors unless explicitly requested.

---

## Supabase and data access

Use the existing Supabase clients:

- Client-side Supabase: `lib/supabaseClient.ts`
- Admin/server Supabase: `lib/supabaseAdmin.ts`

Rules:

- Do not invent table names, column names, RPC functions, policies, or storage buckets.
- Inspect existing code before assuming database structure.
- Do not modify migrations, policies, SQL, or database configuration unless explicitly requested.
- Do not expose service-role/admin logic to client components.
- Do not move admin Supabase usage into client-side code.
- Be careful with authentication/session logic.
- Be careful with Row Level Security assumptions.
- If database behavior is unclear, explain the assumption instead of guessing.

---

## Environment and secrets

Never read, edit, print, or modify secrets unless explicitly requested.

Avoid editing:

- `.env`
- `.env.local`
- `.env.production`
- `.env.*`
- files containing API keys, tokens, private keys, or credentials

Do not expose environment variables to the client unless they are intentionally public and already follow the project convention.

---

## Search and file inspection

Use targeted inspection.

Preferred search command:

- `rg`

Avoid broad or slow searches.

Avoid searching inside:

- `node_modules`
- `.next`
- `dist`
- `build`
- `.git`
- `coverage`
- generated folders
- large static assets

When searching, prefer focused patterns and relevant directories.

Good examples:

- search in `app/` for a route
- search in `components/` for a component
- search in `lib/` for utility or Supabase usage

Bad examples:

- scanning the whole repository for a small text change
- reading unrelated components
- searching generated folders
- searching just to be thorough

---

## Commands

Scripts available in this repo:

- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

Important command policy:

- Do not run tests.
- Do not run build.
- Do not run lint.
- Do not run typecheck.
- Do not run install commands.
- Do not run package manager commands.
- Do not run destructive commands.
- Do not run database migration or deployment commands.
- Do not run `git commit`, `git push`, `git pull`, `git reset`, or `git clean`.

You may suggest manual checks, but do not execute them unless the user explicitly asks.

Allowed safe commands for inspection:

- `git status`
- `git diff`
- `git log`
- `rg`
- directory listing commands
- reading specific files

If unsure whether a command is safe, ask first.

---

## Editing workflow

For simple one-file or clearly scoped tasks:

1. Read the directly relevant file.
2. Apply the smallest safe edit.
3. Summarize what changed.
4. Mention manual checks the user may run.

For non-trivial tasks:

1. Restate the task briefly.
2. Inspect only the relevant files.
3. Identify the smallest safe change.
4. Write a short plan first.
5. Edit only the necessary files.
6. Do not run tests, build, lint, typecheck, or install commands.
7. Summarize exactly what changed.
8. Mention manual checks the user may run.

Do not skip file inspection before editing, but do not inspect unrelated files.

---

## Patch quality rules

Every patch should be:

- minimal
- focused
- easy to review
- consistent with existing style
- safe for the current architecture

Avoid:

- speculative improvements
- unrelated cleanup
- unrelated formatting
- broad renames
- moving files unnecessarily
- changing public APIs unnecessarily
- adding abstractions without need
- touching generated files
- touching lockfiles
- touching environment/deployment files

---

## When to ask before editing

Ask for approval before editing if:

- more than 3 files will be modified
- architecture or routing will change
- database access patterns will change
- authentication/session logic will change
- package dependencies would be needed
- generated files or config files would be touched
- the task is unclear or has multiple valid interpretations

Do not ask for approval for obvious, small, one-file edits unless the change is risky.

---

## Output format after edits

After making changes, always respond with:

1. `Changed files`
2. `What changed`
3. `Manual checks recommended`
4. `Risks / notes`

Do not claim that tests, build, lint, or typecheck passed unless the user explicitly ran them and provided the result.

---

## Preferred behavior for local model limitations

This repository may be edited using a local coding model. To reduce mistakes and improve speed:

- Work incrementally.
- Keep context small and relevant.
- Do not assume unseen files.
- Do not read unrelated files.
- Do not search broadly unless necessary.
- Re-read files before editing if the conversation has become long.
- If context is unclear, ask for clarification instead of guessing.
- If a previous instruction conflicts with the current file contents, trust the current file contents.
- If the requested change is large, split it into small steps.

---

## Final rule

Be conservative, but do not overthink simple edits.

Make the smallest correct change. Do not run tests, build, lint, typecheck, install commands, migrations, or deployment commands unless explicitly requested.
