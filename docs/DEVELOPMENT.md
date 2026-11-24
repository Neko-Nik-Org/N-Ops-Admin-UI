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
  components/   shared, feature-agnostic UI in four layers (see below)
    atoms/      smallest pieces: Input, Badge, NLogo, NSpinner, AuthBackground, ...
    molecules/  small groups of atoms: FormField, LoadingButton, NLoader, Skeleton, OtpInput, ...
    organisms/  self-contained sections: Sidebar, Topbar, dialogs, cards, ScreenLoader, ...
    templates/  page layouts: AppShell (signed-in), AuthShell (sign-in screens)
  config/       typed env access (runtime env.js first, then VITE_* build values)
  constants/    route paths + sidebar sections (routes.ts), shared UI values (config.ts)
  features/     one folder per domain: account, admin, auth, dashboard, invite, tags, vault
  hooks/        shared, feature-agnostic React hooks (useAsyncAction)
  lib/          axios instance, react-query client
  mocks/        in-memory fake backend for features whose API isn't built yet (admin, vault)
  pages/        route-level screens, composed from templates + features
  types/        cross-app shared types
  styles/       global stylesheets for the loaders and sign-in screens (imported once in main.tsx)
  utils/        small framework-free helpers
test/           all tests (vitest), mirroring src/: test/config/env.test.ts tests src/config/env.ts
docker/         container runtime: env.js writer and `serve` config
```

Import from `src` with the `@/` alias (`@/features/tags/hooks/useTags`), straight from the file that
defines the export. There are no barrel (`index.ts`) files.

A component may only import components from its own layer or a lower one: atoms use no other
components, molecules use atoms, organisms use molecules and atoms, and templates may use all three.
Feature-specific logic lives in `features/`. Components only call its hooks and API functions.

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
- **Enforced 2FA (access policies).** Sign-in also reports `is_2fa_enforced` and, per factor,
  `enforce_<factor>_2fa` (with `has_<factor>_2fa` on a 2FA challenge). `features/auth/securitySetup.ts`
  turns those into ordered setup steps (email: verify the address, then turn on email codes; TOTP:
  add an authenticator app and confirm one code). They are stored apart from the profile
  (`store/securityRequirements.ts`) because only sign-in reports them, and cleared at sign-out.
  While any step is pending, `RequireSecuritySetup` sends every app route to `/security-setup`
  (`SecuritySetupPage`), which offers only the steps and sign-out. To add a factor (e.g. passkeys),
  add it to `SECOND_FACTORS` and `FACTOR_SETUP` and give its step a view in `STEP_VIEWS`.
  The `/user/2fa/*` setup endpoints are **not released in the Main API yet**. Their expected shapes are
  in `features/auth/api/twoFactorSetup.ts`; a 404 tells the user setup isn't available yet. This is a
  UI gate only: the API must also refuse other requests until setup is done.
- Permission checks (`features/auth/permissions.ts`) mirror the Main API's RBAC
  (`docs/Permissions.md` in that repo) and tag scoping, where an empty tag list means every tag.
  They only hide or disable UI. The API's `403` is the real enforcement.
- The backend's `ALLOWED_ORIGINS` must include this app's origin (dev and prod) for CORS to work.

## Self-service account (`/user/self/*`)

The Account page uses these endpoints. Each needs a valid session.

| Action                    | Endpoint                                   | Notes                                                                                                                                                          |
| ------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Send / re-send email code | `POST /user/self/verify-email/send`        | 7-digit code, valid 5 min. Re-sending replaces the old code. `409` means already verified.                                                                     |
| Verify email code         | `POST /user/self/verify-email/validate`    | Body is a bare JSON string (`"1234567"`). `400` means a wrong code (the API discards it, so a new one must be sent), `410` means expired.                      |
| Username available?       | `GET /user/self/user-name/check/:username` | `200` means free, `409` means taken. Reusable for admin user forms.                                                                                            |
| Change username           | `POST /user/self/change-username`          | Bare JSON string body.                                                                                                                                         |
| Change password           | `POST /user/self/change-password`          | Bare JSON string body, base64-encoded like at sign-in.                                                                                                         |
| Edit profile details      | `POST /user/self/details`                  | Free-form JSON that replaces the whole object. The editor changes text values only. Non-text values are merged back unchanged (`features/account/details.ts`). |
| Deactivate self           | `DELETE /user/self/deactivate`             | Ends this session. Only an admin can reactivate the account.                                                                                                   |

Routes that take `web::Json<String>` need `JSON.stringify(value)` and an explicit
`Content-Type: application/json`. Axios would otherwise send a plain string as form data. See
`postJsonString` in `features/account/api/account.ts`. Some of these routes answer with plain-text
bodies, not `{ error, code }`. `lib/axios.ts` uses a short text body as the message and rejects with
an `ApiError` carrying `status`. Read the status with `errorStatus(error)` from `@/types/api`.

**Session sync.** The API keeps a copy of the profile with the session in Redis and rebuilds it only
on `POST /auth/refresh`, which works only for "Keep me signed in" sessions. After a self-service
change, `useSyncSelfSession` (in `features/account/hooks`) updates the in-app profile. For remembered
sessions it then calls `/auth/refresh`. Other sessions are not refreshed, so their server copy
updates at the next sign-in. If the refresh fails with `401`, the user is asked to sign in again.

**Live contract test.** `test/integration/selfAccount.live.test.ts` runs the real API modules
against a running Main API. It is skipped unless `NOPS_LIVE_API_URL` is set. It changes data
(passwords, usernames, deactivation), so only point it at a throwaway database. The file header
lists the users and services it needs.

## Features with planned backends

Some screens are built ahead of their backend. When their endpoints are missing, they show an
explicit "not available / not connected yet" state and **never fabricate data**:

- **Invite** (`/invite?code=…`): the emailed link's `code` is base64 JSON
  (`{ email, invitation_code, invited_by, org_name }`), decoded in the browser by
  `parseInviteCode` (`features/invite/api/invite.ts`). The form posts to `POST /invite/join/{code}`,
  which needs no session and answers 200 with no body, so the new user is sent to sign in with the
  username filled in. The API takes the full create-user body but uses the invitation's email, role
  and policy, so those fields are placeholders. Sending and revoking invitations is Admin ›
  Invitations (`features/admin/api/invitations.ts`).
- **Overview dashboard**: tag filters use the real `GET /tag/list`. Fleet, approvals, workflow, and
  alert data expects one aggregate `GET /dashboard/overview`. Actions not wired up yet show a toast
  instead of failing silently.
- Other sidebar sections render the shared `ComingSoonPage`.
- **Admin** (users, roles, API keys, audit logs, organization) and **Vault** (projects, secrets,
  config files, notes): the Main API has no endpoints for these yet, so their `features/<name>/api`
  modules call an in-memory fake backend in `src/mocks/` (`adminDb.ts`, `vaultDb.ts`, shared
  `helpers.ts`). Their pages show a "Mock data" badge, and the data resets on reload. Features never
  import each other's mock data. Anything shared between the two mocks lives in `src/mocks/`.

If you add the real backend for one of these, remove the fallback handling in the matching
`features/<name>/api` module.

## Theming

Light, dark, and system modes come from `src/app/theme.ts` (a Jotai atom persisted to
`localStorage`) and `<html data-theme>`. All colors are CSS variables in `src/index.css`
(`--color-ink`, `--color-signal`, `--color-warning`, …), with the dark default and the light
override defined together. Use these tokens instead of hard-coded colors. The loader styles map
their colors onto them at the top of `styles/n-loading.css`, so they follow the theme too.

Fonts are IBM Plex Sans and IBM Plex Mono (SIL Open Font License), bundled with the app from the
`@fontsource` packages (Latin subset, only the weights in use), so the app makes no requests to an
outside font service.

## Runtime configuration

On container start, `docker/write-env.mjs` writes `dist/env.js` (`window.__NOPS_ENV__ = {...}`)
from the container's environment. `index.html` loads that file before the app, and
`src/config/env.ts` prefers it over the `VITE_*` build values. This lets one image run anywhere:
change a value in compose, run `docker compose up -d`, and you're done. `docker/serve.json` serves
`env.js` and `index.html` with `no-cache` and hashed assets with a long cache.

In local dev, `public/env.js` is an empty placeholder, so the `VITE_*` values from `.env` apply.

## CI/CD

**`.github/workflows/ci.yml`** is the whole pipeline, and it builds the Docker image once per run:

1. **verify**: formats, lints, type-checks, tests and builds the app.
2. **docker**: builds the image and smoke-tests it. The container must start, write `env.js`, serve
   the SPA including deep routes, and refuse to start without config. On a push to `main` or a tag,
   it then pushes that same image (taken from the build cache, not rebuilt) to Docker Hub as
   `neko7nik/n-ops-admin-ui:latest` and `:<branch|tag>`.
3. **deploy** (pushes only): pulls the new image on the maintainers' server over SSH.

Pull requests run steps 1 and 2 without pushing and use no secrets. Pushes need these repo secrets:
`DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_PRIVATE_KEY`, `SERVER_IP`. Forks don't have them, so
publishing and deploying only work in the upstream repo.

### Self-hosting on a server

Install Docker with the compose plugin. In a directory of your choice, add this repo's
`docker-compose.yaml` and a `.env` containing `API_BASE_URL` and `TURNSTILE_SITE_KEY`, then run
`docker compose pull && docker compose up -d`. Updating the image never touches either file, so
your config stays in place.
