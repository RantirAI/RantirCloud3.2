# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the Supabase monorepo (Turborepo + pnpm workspaces). The primary app is **Studio** (`apps/studio`), a Next.js dashboard for managing Supabase projects. Other apps include `www` (marketing site), `docs`, `design-system`, `ui-library`, and `learn`.

### Running Studio locally

Studio requires Docker-backed Supabase services. The recommended flow:

1. Start backend: `npx supabase start -x studio` (starts Postgres, PostgREST, GoTrue, Kong, pg-meta, etc. on port 54321)
2. Generate env: `npx supabase status --output json > keys.json && node scripts/generateLocalEnv.js` (creates `apps/studio/.env.test`)
3. Start Studio: `NODE_ENV=test pnpm --prefix ./apps/studio dev` (port 8082)

The shorthand `pnpm setup:cli` in root `package.json` combines steps 1-2. The shorthand `pnpm dev:studio-local` does setup + dev.

**Gotcha:** Studio must be started with `NODE_ENV=test` so Next.js loads `.env.test` (which has correct CLI-generated API URLs on port 54321). The committed `.env` has placeholder URLs on port 8000 for the Docker Compose approach and will **not** work with `supabase start`.

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
