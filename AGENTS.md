# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the Supabase monorepo (Turborepo + pnpm workspaces). The primary app is **Studio** (`apps/studio`), a Next.js dashboard for managing Supabase projects. Other apps include `www` (marketing site), `docs`, `design-system`, `ui-library`, and `learn`.

### Running Studio locally

Studio requires Docker-backed Supabase services. Two approaches:

**Option A — `.env.local` (preferred for local dev):**

1. Start backend: `npx supabase start -x studio`
2. Create `apps/studio/.env.local` with the correct CLI-generated values (API on port 54321). See `apps/studio/.env` for the variable names; override `SUPABASE_URL`, `SUPABASE_PUBLIC_URL`, `STUDIO_PG_META_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, etc. to point to `http://127.0.0.1:54321`.
3. Start Studio: `pnpm --filter studio dev` (port 8082). No `NODE_ENV=test` needed.

**Option B — `.env.test` (legacy approach):**

1. `pnpm setup:cli` (runs `supabase start -x studio`, generates `keys.json`, creates `apps/studio/.env.test`)
2. Start Studio: `NODE_ENV=test pnpm --prefix ./apps/studio dev` (port 8082)

The shorthand `pnpm dev:studio-local` combines setup + dev with Option B.

**Gotcha:** The committed `.env` has placeholder URLs on port 8000 (for the Docker Compose approach). When using `supabase start`, the API runs on port 54321. You must either use `.env.local` (Option A) or `NODE_ENV=test` (Option B) to override these values. `.env.local` is NOT loaded when `NODE_ENV=test`.

### Running other apps

- `www`: Copy `apps/www/.env.local.example` to `apps/www/.env.local`, then `pnpm dev:www` (port 3000). No Docker needed.
- `docs`: `pnpm dev:docs` (port 3001). No Docker needed.

### Lint, test, build

Standard commands are in root `package.json`:
- Lint: `pnpm lint` (or `--filter=studio`)
- Test: `pnpm test:studio` (vitest)
- Build: `pnpm build:studio`
- Prettier check: `pnpm test:prettier`

### Docker in Cloud Agent environment

Docker must be installed and configured with `fuse-overlayfs` storage driver and `iptables-legacy` for the nested container environment. After installing Docker, run `sudo dockerd` and `sudo chmod 666 /var/run/docker.sock` before using Docker commands.

### Key ports

| Service | Port |
|---------|------|
| Studio (Next.js dev) | 8082 |
| Supabase API (Kong) | 54321 |
| Postgres | 54322 |
| www | 3000 |
| docs | 3001 |
