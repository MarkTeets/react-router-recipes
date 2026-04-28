# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
docker-compose up          # Start PostgreSQL (port 5433)
npm run dev                # Start dev server with HMR (http://localhost:5173)

# Production
npm run build              # Build SSR bundle (server + client)
npm start                  # Serve production build

# Type checking
npm run typecheck          # Run tsc + react-router typegen
```

There are no test or lint commands configured.

## Architecture

**Full-stack React Router v7 app** with SSR enabled, PostgreSQL via Prisma, and Tailwind CSS.

### Routing

Routes are declared in `app/routes.ts` using React Router's `index()`/`route()` API, then implemented as files under `app/routes/`. The root layout (`app/root.tsx`) wraps all routes with a sidebar nav.

Current route tree:
- `/` → `routes/home.tsx`
- `/app` (layout) → `routes/app.tsx` with nested `/app/pantry`
- `/settings` (layout) → `routes/settings.tsx` with nested `/settings/app` and `/settings/profile`

### Data Layer

- **`app/db.server.ts`** — Singleton Prisma client with PrismaPg adapter; import this for all DB access.
- **`app/models/*.server.ts`** — Model functions (currently `pantry-shelf.server.ts`). Keep DB queries here, not in route files.
- **`app/utils/validation.ts`** — Generic `validateForm(formData, schema)` using Zod; returns field-level errors on failure.

### Mutation Pattern

Routes use a single `action` with an `_action` field to dispatch multiple mutations:
```tsx
// In the action:
const action = formData.get("_action");
if (action === "createShelf") { ... }
if (action === "deleteShelf") { ... }
```

Use `useFetcher()` for mutations that shouldn't trigger navigation.

### Key Conventions

- **`.server.ts` suffix** — Files that must only run on the server (DB access, model functions).
- **Path alias `~/*`** maps to `./app/*` — use for all imports (e.g., `import { db } from "~/db.server"`).
- **Prisma generated types** live in `generated/prisma/client` (not the default location).
- **React Router types** are generated into `.react-router/types/` by `typecheck`/`typegen`.
- **Custom Tailwind theme** in `app/app.css`: primary color `#00743e` (color-primary), light variant `#4c9d77` (color-primary-light).

### Database Schema

```
PantryShelf (id, name, createdAt, updatedAt)
  └── PantryItem[] (id, name, shelfId — cascade deletes)
```

Run migrations with `npx prisma migrate dev`. Seed script at `prisma/seed.ts`.
