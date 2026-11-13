# Development guide

Internals of the N-Ops Admin UI, for contributors. For setup, see the [README](../README.md).

## Architecture

- **Atomic design** for shared UI: `src/components/{atoms,molecules,organisms,templates}`.
- **Feature-layered** app logic: each feature under `src/features/<name>` owns its own `api/`,
  `hooks/`, `schema/`, `store/`, and `types.ts`.
- Cross-cutting code lives in `src/lib` (axios instance, React Query client), `src/config` (typed env
  access) and `src/app` (router, providers, route guards).

```
src/
  app/          router, providers, auth route guards, theme
  components/   atoms -> molecules -> organisms -> templates (shared, feature-agnostic UI)
    loading/    N-mark loaders, LoadingButton, ScreenLoader, skeletons, async helpers
  config/       typed env access (runtime env.js first, then VITE_* build values)
  constants/    route paths + sidebar sections (routes.ts), shared UI values (config.ts)
  features/     one folder per domain: auth, account, tags, dashboard, invite
  lib/          axios instance, react-query client
  pages/        route-level screens, composed from templates + features
  types/        cross-app shared types
  utils/        small framework-free helpers
test/           all tests (vitest), mirroring src/: test/config/env.test.ts tests src/config/env.ts
docker/         container runtime: env.js writer and `serve` config
```

Import from `src` with the `@/` alias (`@/features/tags/hooks/useTags`).

Never hardcode a route path: use `ROUTES` from `@/constants/routes`. To add a dashboard section, add it
to `APP_SECTIONS` there. The router, sidebar and breadcrumb all pick it up automatically. Join class
names with `cn` from `@/utils/cn`.

## Auth flow

The UI talks to [N-Ops Main API](https://github.com/Neko-Nik-Org/N-Ops-Main-API).

- `POST /auth/login` takes `user_name`, a base64-encoded `password`, `remember_me`, and a
  `cf-turnstile-token` header. API auth uses no cookies: the client stores the response's
  `session_id` and sends it back on every request as the `x-nops-token` header (see
  `src/lib/axios.ts`).
- `GET /auth/verify`, `/auth/refresh`, and `DELETE /auth/logout` use the same header. A `401` clears
  the local session.
- The login response can ask for 2FA (`is_2fa_required`). `TwoFactorPage` at `/login/verify-2fa`
  handles it, receiving its context through router state rather than the URL. It supports TOTP and
  email codes according to the account's `has_totp_2fa`/`has_email_2fa` flags. `/auth/verify-otp`
  and `/auth/resend-otp` are **not released in the Main API yet**. Until they are, the client
  expects the shapes in `features/auth/api/twoFactor.ts` and shows a clear toast when a call fails.
- Permission checks (`features/auth/permissions.ts`) mirror the Main API's RBAC
  (`docs/Permissions.md` in that repo) and tag scoping, where an empty tag list means every tag.
  They only hide or disable UI. The API's `403` is the real enforcement.
- The backend's `ALLOWED_ORIGINS` must include this app's origin (dev and prod) for CORS to work.

## Features with planned backends

Some screens are built ahead of their backend. When their endpoints are missing, they show an
explicit "not available / not connected yet" state and **never fabricate data**:

- **Invite** (`/invite/:token`): expects `GET /invite/:token` for the preview and
  `POST /invite/:token/accept`, which returns the same shape as `/auth/login` so the new user is
  signed in straight away.
- **Overview dashboard**: tag filters use the real `GET /tag/list`. Fleet, approvals, workflow, and
  alert data expects one aggregate `GET /dashboard/overview`. Actions not wired up yet show a toast
  instead of failing silently.
- Other sidebar sections render the shared `ComingSoonPage`.

If you add the real backend for one of these, remove the fallback handling in the matching
`features/<name>/api` module.

## Theming

Light, dark, and system modes come from `src/app/theme.ts` (a Jotai atom persisted to
`localStorage`) and `<html data-theme>`. All colors are CSS variables in `src/index.css`
(`--color-ink`, `--color-signal`, `--color-warning`, …), with the dark default and the light
override defined together. Use these tokens instead of hard-coded colors. The loading kit maps its
colors onto them at the top of `components/loading/n-loading.css`, so it follows the theme too.

Fonts are IBM Plex Sans and IBM Plex Mono (SIL Open Font License), loaded from Google Fonts.

## Runtime configuration

On container start, `docker/write-env.mjs` writes `dist/env.js` (`window.__NOPS_ENV__ = {...}`)
from the container's environment. `index.html` loads that file before the app, and
`src/config/env.ts` prefers it over the `VITE_*` build values. This lets one image run anywhere:
change a value in compose, run `docker compose up -d`, and you're done. `docker/serve.json` serves
`env.js` and `index.html` with `no-cache` and hashed assets with a long cache.

In local dev, `public/env.js` is an empty placeholder, so the `VITE_*` values from `.env` apply.

## CI/CD

- **`.github/workflows/ci.yml`** runs on every PR and every push to `main`, with no secrets. It
  lints, type-checks, tests, and builds. Then it builds the Docker image and smoke-tests it: the
  container starts, writes `env.js`, serves the SPA including deep routes, and refuses to start
  without config.
- **`.github/workflows/docker-build-and-deploy.yaml`** runs on pushes to `main` and on tags. It
  pushes `neko7nik/n-ops-admin-ui:latest` and `:<branch|tag>` to Docker Hub, then deploys to the
  maintainers' server over SSH.

  It needs these repo secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_PRIVATE_KEY`,
  `SERVER_IP`. Forks don't have them, so this workflow only does useful work in the upstream repo.

### Self-hosting on a server

Install Docker with the compose plugin. In a directory of your choice, add this repo's
`docker-compose.yaml` and a `.env` containing `API_BASE_URL` and `TURNSTILE_SITE_KEY`, then run
`docker compose pull && docker compose up -d`. Updating the image never touches either file, so
your config stays in place.
