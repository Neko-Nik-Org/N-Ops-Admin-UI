# N-Ops Admin UI

Admin console for the N-Ops infrastructure control plane. React + TypeScript + Vite, talking to [N-Ops-Main-API](../N-Ops-Main-API).

## Architecture

- **Atomic design** for UI components: `src/components/{atoms,molecules,organisms,templates}`.
- **Bulletproof/feature-layered** for app logic: each feature under `src/features/<name>` owns its own `api/`, `hooks/`, `schema/`, `store/`, and `types.ts`.
- Cross-cutting concerns live in `src/lib` (axios, react-query client), `src/config` (env), `src/app` (router, providers, route guards).

```
src/
  app/          router, providers, auth route guards
  components/   atoms -> molecules -> organisms -> templates (shared, feature-agnostic UI)
  config/       typed env access
  features/     one folder per domain (auth/...), each self-contained
  lib/          axios instance, react-query client
  pages/        route-level screens, composed from templates + features
  types/        cross-app shared types
  utils/        small framework-free helpers
test/           all tests (vitest), mirroring src/: test/config/env.test.ts tests src/config/env.ts
```

## Getting started

```bash
cp .env.example .env   # fill in the values (VITE_* for npm run dev)
npm install
npm run dev
```

Scripts: `npm run dev`, `build`, `preview`, `lint` (oxlint), `typecheck`, `test` (vitest).

## Theme

Light/dark/system, via `src/app/theme.ts` (a Jotai atom persisted to `localStorage`) + `<html data-theme>`. All colors are CSS variables in `src/index.css` (`--color-ink`, `--color-signal`, etc.) — both the `dark` default and the `light` override live there. `ThemeToggle` (`components/molecules`) is the Sun/Moon/Monitor control wired into `AuthLayout` and the dashboard `Topbar`.

## Loading kit

`src/components/loading/` (brought in whole, see its own comments) provides the N-mark loaders, `LoadingButton`, `ScreenLoader`, skeletons, and `useAsyncAction`/`useDelayedLoading`. Its colors are remapped in `n-loading.css`'s top `:root` block to this app's own `--color-*` tokens (instead of its default mint/violet), so it already follows light/dark theme for free. Wired up: `ScreenLoader` for the session-check screen (`app/guards.tsx`), `LoadingButton` for sign-in/sign-out/invite-accept, and `DashboardSkeleton` for the Overview page's first load.

## Auth flow (from N-Ops-Main-API)

- `POST /auth/login` takes `user_name`, base64-encoded `password`, `remember_me`, plus a `cf-turnstile-token` header. No cookies are used for API auth — the response's `session_id` is stored client-side and echoed back on every request as the `x-nops-token` header (see `src/lib/axios.ts`).
- `GET /auth/verify` / `DELETE /auth/logout` use that same header; a 401 clears the local session.
- The login response can request 2FA (`is_2fa_required`) — handled by `TwoFactorPage`/`TwoFactorForm` at `/login/verify-2fa` (context passed via router state, never the URL). It supports TOTP and/or email codes per the account's `has_totp_2fa`/`has_email_2fa` flags, and only offers switching methods when both exist (no fabricated "security key" option — the backend has no such flag). `features/auth/api/twoFactor.ts` posts to `/auth/verify-otp` and `/auth/resend-otp`, which **don't exist yet** (`auth::verify_otp`/`auth::resend_otp` are commented out in `N-Ops-Main-API/src/main.rs`) — those paths/shapes are this app's best guess at the contract. Both calls fail gracefully today with an explanatory toast instead of a raw error; drop that fallback once the real endpoints land.
- The backend's `ALLOWED_ORIGINS` env var must include this app's origin (dev and prod) for CORS to work.

## Invite flow

`/invite/:token` (`InvitePage`/`InviteForm`) is a **fully speculative** screen — unlike 2FA, there's no invite table, route, or even a commented-out stub anywhere in `N-Ops-Main-API`. `features/invite/api/invite.ts` guesses `GET /invite/:token` for the invite's role/tags/email/inviter preview and `POST /invite/:token/accept` for account creation, with the accept call guessed to return the same shape as `/auth/login`'s success response (so accepting signs you straight in via the existing `useApplySession`). Until that backend lands, the page shows a real "invite isn't available" state for any failed lookup, and accepting fails gracefully with a toast instead of a raw error.

## Dashboard shell

`AppShell` (sidebar + topbar + `<Outlet>`) wraps every authenticated route. The sidebar nav lists all ten sections from the reference design; only **Overview** (`OverviewPage`) is real — the rest render `ComingSoonPage`, a shared placeholder, since nothing is built there yet. On mobile (`<lg`) the sidebar becomes a slide-over drawer opened from the `Topbar`'s menu button.

Two very different levels of "real" feed the Overview page:
- **Tags are real** — `features/tags/api/tags.ts` calls the actual `GET /tag/list` endpoint and drives the tag-filter pills.
- **Fleet/approvals/workflow/alert data is fully speculative** — N-Ops-Main-API has no backend for any of it (no tables, no routes, not even a commented-out stub). `features/dashboard/api/dashboard.ts` guesses one aggregate `GET /dashboard/overview` call. Rather than fabricate numbers when that 404s, the page shows an honest "Live fleet data isn't connected yet" panel instead of the stat tiles/fleet table/approvals list — consistent with how the invite and 2FA screens handle their own guessed endpoints. The `Approve`/`Open thread`/`+ Add server`/notification-bell actions are all present for layout fidelity but show a "not wired up yet" toast rather than doing nothing silently.

## Configuration

Two settings, read **at run time** (not baked into the build):

| Container env (`docker compose`) | Local dev (`.env`, Vite) | What it is |
|---|---|---|
| `API_BASE_URL` | `VITE_API_BASE_URL` | N-Ops Main API base URL, no trailing slash |
| `TURNSTILE_SITE_KEY` | `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for login |

On container start, `docker/write-env.mjs` writes `dist/env.js` (`window.__NOPS_ENV__ = {...}`) from the container's environment; `index.html` loads it before the app, and `src/config/env.ts` prefers it over the `VITE_*` build values. So **one image runs anywhere**: change a value in compose and `docker compose up -d`, no rebuild. The container refuses to start if either value is missing. `env.js` and `index.html` are served `no-cache` (`docker/serve.json`) so a config change is picked up on the next page load.

## Docker

```bash
cp .env.example .env              # fill in API_BASE_URL / TURNSTILE_SITE_KEY
docker compose up -d              # runs neko7nik/n-ops-admin-ui:latest on 127.0.0.1:8080, config from .env
```

To try a local build instead of the published image: `docker build -t neko7nik/n-ops-admin-ui:latest .` then `docker compose up -d`.

The runtime stage serves `dist/` with [`serve`](https://github.com/vercel/serve) (`-s` for SPA fallback) on `node:22-alpine`. Port is bound to `127.0.0.1` only; put a reverse proxy in front on the server.

## CI/CD

- **`.github/workflows/ci.yml`**: on every PR and push to `main`, without secrets. Lint, typecheck, test, build, then builds the Docker image and smoke-tests it (container starts, writes `env.js`, serves the SPA, refuses to start without config).
- **`.github/workflows/docker-build-and-deploy.yaml`**: on push to `main` or a tag. Same flow as `YFS-FrontEnd`:
  - **build** pushes `neko7nik/n-ops-admin-ui:latest` plus `:<branch or tag>` to Docker Hub.
  - **deploy** SSHes to the server as `root`, checks `/srv/n-ops-admin-ui/.env` exists and the compose file there uses `env_file`, then `docker compose pull && docker compose up -d`.

Repo secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_PRIVATE_KEY`, `SERVER_IP`.

One-time server setup: Docker with the compose plugin, then in `/srv/n-ops-admin-ui` put `docker-compose.yaml` (from this repo) and a `.env` with `API_BASE_URL` and `TURNSTILE_SITE_KEY`. Deploys don't touch either file, so config stays on the server.

## Known gaps / deliberate calls made without asking

- Added `react-router-dom` and `vitest` beyond the requested package list — routing is load-bearing for an "Admin UI" (more pages are coming), and vitest covers the couple of non-trivial logic paths (the login schema, base64 encoding) with minimal tests.
- Visual design is dark-first (with light/dark/system support), IBM Plex Sans/Mono, mint (`--color-signal`) + violet (`--color-accent-secondary`) brand gradient — matched to a reference screenshot provided mid-project after the original design-reference links came back empty.
- The login page's "Forgot password?" link and the "ask an admin to create an account" line are copy/UI only — there's no password-reset or invite-link endpoint on the backend yet, so the former shows a toast explaining that instead of a dead link. The reference mockup's org-switcher badge and "recorded in the audit log" line were left out: N-Ops has no pre-login org/tenant concept today (the login API takes only `user_name`/`password`), and login isn't confirmed to be audit-logged yet.
- Request a Cloudflare Turnstile site key scoped to the admin domain before production (`.env.example` ships Cloudflare's always-pass test key).
- Session restore on page reload calls `/auth/verify` but doesn't re-fetch user details (there's no "current user" endpoint wired up yet), so a refreshed session shows a generic signed-in state rather than the user's name until they log in again.
- Added a `--color-warning` token (amber) alongside `--color-danger` (red) — the dashboard reference visually distinguishes "pending/waiting" from "failed/offline", and reusing the red danger color for both would have been semantically wrong.
- The reference dashboard has no visible sign-out control, so it was added as a small account row at the bottom of the sidebar (name + icon button) rather than left unreachable.
