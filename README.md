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
```

## Getting started

```bash
cp .env.example .env   # fill in VITE_API_BASE_URL / VITE_TURNSTILE_SITE_KEY
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

## Docker

```bash
docker build --build-arg VITE_API_BASE_URL=... --build-arg VITE_TURNSTILE_SITE_KEY=... -t n-ops-admin-ui .
docker run -p 8080:8080 n-ops-admin-ui
```

Vite bakes `VITE_*` vars into the bundle at build time, so they're passed as Docker build args, not runtime env vars — rebuild the image to change them. `docker-compose.yaml` wraps this for local use.

The runtime stage serves `dist/` with [`serve`](https://github.com/vercel/serve) (`-s` for SPA fallback) on a plain `node:22-alpine` image, rather than nginx — no `nginx.conf` to maintain, at the cost of a heavier runtime image than nginx's would have been.

## CI/CD

`.github/workflows/ci.yml`: lint + typecheck + test + build on every PR and push to `main`; on push to `main`, also builds and pushes a Docker image to `ghcr.io/<repo>:latest` / `:<sha>`. Set repo variable `VITE_API_BASE_URL` and secret `VITE_TURNSTILE_SITE_KEY` for that image build, or switch the registry to Docker Hub to match `N-Ops-Main-API`'s `neko7nik/*` images.

## Known gaps / deliberate calls made without asking

- Added `react-router-dom` and `vitest` beyond the requested package list — routing is load-bearing for an "Admin UI" (more pages are coming), and vitest covers the couple of non-trivial logic paths (the login schema, base64 encoding) with minimal tests.
- Visual design is dark-first (with light/dark/system support), IBM Plex Sans/Mono, mint (`--color-signal`) + violet (`--color-accent-secondary`) brand gradient — matched to a reference screenshot provided mid-project after the original design-reference links came back empty.
- The login page's "Forgot password?" link and the "ask an admin to create an account" line are copy/UI only — there's no password-reset or invite-link endpoint on the backend yet, so the former shows a toast explaining that instead of a dead link. The reference mockup's org-switcher badge and "recorded in the audit log" line were left out: N-Ops has no pre-login org/tenant concept today (the login API takes only `user_name`/`password`), and login isn't confirmed to be audit-logged yet.
- Cloudflare Turnstile site key defaults to the one already used by `N-Ops-WebSite`; request a key scoped to the admin domain before production.
- Session restore on page reload calls `/auth/verify` but doesn't re-fetch user details (there's no "current user" endpoint wired up yet), so a refreshed session shows a generic signed-in state rather than the user's name until they log in again.
- Added a `--color-warning` token (amber) alongside `--color-danger` (red) — the dashboard reference visually distinguishes "pending/waiting" from "failed/offline", and reusing the red danger color for both would have been semantically wrong.
- The reference dashboard has no visible sign-out control, so it was added as a small account row at the bottom of the sidebar (name + icon button) rather than left unreachable.
