# Development guide

Internals of the N-Ops Admin UI, for contributors. For setup, see the [README](../README.md).

## Architecture

The layout follows the team's _Frontend Structure & Development Guidelines_. The core rule: keep code
close to the feature that owns it, and move it to a shared folder only when it is genuinely reused.

```
src/
  api/          axios client (client.ts), React Query client, one file per API resource (users.ts, roles.ts, …)
  assets/       static files: styles/ holds the loader and sign-in stylesheets (imported once in main.tsx)
  components/   genuinely shared UI only, flat: Badge, Input, Dialog, LoadingButton, PageToolbar, …
    AppShell/   signed-in layout (index.tsx) with Sidebar, Topbar and their parts
    AuthShell/  sign-in layout (index.tsx) with AuthCard, AuthField, AuthBackground
  constants/    static values only: routes.ts (paths + sidebar), config.ts, countries.ts, permissions.ts
  data/         in-memory mock backends for APIs that aren't built yet (mockAdmin.ts, mockVault.ts, …)
  hooks/        reusable hooks: data hooks per domain (useUsers, useRoles, useAccessPolicies, useVault, …), auth hooks, useGoBack
  pages/        one folder per page with an index.tsx that composes it, plus the page's own
                components, page-only hooks and form validation (e.g. pages/admin/users/UserFormDialog.tsx,
                pages/auth/login/loginValidation.ts). CRUD modules split into list/, details/, form/.
  routes/       router, route guards and lazy-loaded page imports
  store/        Jotai atoms for client state: session, session token, theme, sidebar, selected tag, …
  types/        shared types, one file per domain (user.ts, role.ts, accessPolicy.ts, vault.ts, …)
  utils/        pure helpers: formatting, CIDR checks, secure storage, shared validation rules, …
  App.tsx, AppProviders.tsx, main.tsx
test/           all tests (vitest), mirroring src/: test/utils/cidr.test.ts tests src/utils/cidr.ts
docker/         container runtime: env.js writer and `serve` config
```

Where code goes:

- Used by one page → that page's folder (`pages/<page>/`). A complex section gets its own subfolder
  with an `index.tsx`. Don't create a folder per component.
- Used by several pages → `components/`, `hooks/`, `utils/` or `types/`.
- Server data goes through TanStack Query hooks (`hooks/`) over the `api/` functions; never copy it
  into Jotai. Jotai (`store/`) is for client state only; simple local state uses `useState`.
- Form validation (Yup) sits next to the form; rules shared by several forms live in
  `utils/validation.ts` (e.g. pages/admin/users/userValidation.ts uses its username and password rules).
- Names: PascalCase components, `use` + PascalCase hooks, camelCase utilities, resource-named API files.
  No vague names (`helpers.ts`, `common.ts`, `misc.ts`).
- Before adding a component, hook, util, type or schema, look for an existing one.

Pages about one item (details, create, edit) start with `PageToolbar`: the path on the left, the page's
buttons and Back (`useGoBack`) on the right, on one row.

Import from `src` with the `@/` alias (`@/hooks/useTags`), straight from the file that defines the
export. There are no barrel (`index.ts`) files; a folder's `index.tsx` is its page or layout component.

Never hardcode a route path: use `ROUTES` from `@/constants/routes`. To add a dashboard section, add it
to `APP_SECTIONS` there. The router and sidebar pick it up automatically. Join class names with `cn`
from `@/utils/cn`.

## Auth flow

The UI talks to [N-Ops Main API](https://github.com/Neko-Nik-Org/N-Ops-Main-API).

- `POST /auth/login` takes `user_name`, a base64-encoded `password`, `remember_me`, and a
  `cf-turnstile-token` header. API auth uses no cookies: the client stores the response's
  `session_id` and sends it back on every request as the `x-nops-token` header (see
  `src/api/client.ts`).
- `GET /auth/verify`, `/auth/refresh`, and `DELETE /auth/logout` use the same header. A `401` clears
  the local session.
- The login response can ask for 2FA (`is_2fa_required`). `TwoFactorPage` at `/login/verify-2fa`
  handles it, receiving its context through router state rather than the URL. It supports TOTP and
  email codes according to the account's `has_totp_2fa`/`has_email_2fa` flags. `/auth/verify-otp`
  and `/auth/resend-otp` are **not released in the Main API yet**. Until they are, the client
  expects the shapes in `api/twoFactor.ts` and shows a clear toast when a call fails.
- **Enforced 2FA (access policies).** Sign-in also reports `is_2fa_enforced` and, per factor,
  `enforce_<factor>_2fa` (with `has_<factor>_2fa` on a 2FA challenge). `utils/securitySetup.ts`
  turns those into ordered setup steps (email: verify the address, then turn on email codes; TOTP:
  add an authenticator app and confirm one code). They are stored apart from the profile
  (`store/securityRequirements.ts`) because only sign-in reports them, and cleared at sign-out.
  While any step is pending, `RequireSecuritySetup` sends every app route to `/security-setup`
  (`SecuritySetupPage`), which offers only the steps and sign-out. To add a factor (e.g. passkeys),
  add it to `SECOND_FACTORS` and `FACTOR_SETUP` and give its step a view in `STEP_VIEWS`.
  The `/user/2fa/*` setup endpoints are **not released in the Main API yet**. Their expected shapes are
  in `api/twoFactorSetup.ts`; a 404 tells the user setup isn't available yet. This is a
  UI gate only: the API must also refuse other requests until setup is done.
- Permission checks (`hooks/usePermissions.ts`) mirror the Main API's RBAC
  (`docs/Permissions.md` in that repo) and tag scoping, where an empty tag list means every tag.
  They only hide or disable UI. The API's `403` is the real enforcement.
- The backend's `ALLOWED_ORIGINS` must include this app's origin (dev and prod) for CORS to work.

## Self-service account (`/user/self/*`)

The Account page uses these endpoints. Each needs a valid session.

| Action                    | Endpoint                                   | Notes                                                                                                                                                      |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Send / re-send email code | `POST /user/self/verify-email/send`        | 7-digit code, valid 5 min. Re-sending replaces the old code. `409` means already verified.                                                                 |
| Verify email code         | `POST /user/self/verify-email/validate`    | Body is a bare JSON string (`"1234567"`). `400` means a wrong code (the API discards it, so a new one must be sent), `410` means expired.                  |
| Username available?       | `GET /user/self/user-name/check/:username` | `200` means free, `409` means taken. Reusable for admin user forms.                                                                                        |
| Change username           | `POST /user/self/change-username`          | Bare JSON string body.                                                                                                                                     |
| Change password           | `POST /user/self/change-password`          | Bare JSON string body, base64-encoded like at sign-in.                                                                                                     |
| Edit profile details      | `POST /user/self/details`                  | Free-form JSON that replaces the whole object. The editor changes text values only. Non-text values are merged back unchanged (`utils/profileDetails.ts`). |
| Deactivate self           | `DELETE /user/self/deactivate`             | Ends this session. Only an admin can reactivate the account.                                                                                               |

Routes that take `web::Json<String>` need `JSON.stringify(value)` and an explicit
`Content-Type: application/json`. Axios would otherwise send a plain string as form data. See
`postJsonString` in `api/account.ts`. Some of these routes answer with plain-text
bodies, not `{ error, code }`. `api/client.ts` uses a short text body as the message and rejects with
an `ApiError` carrying `status`. Read the status with `errorStatus(error)` from `@/types/api`.

**Session sync.** The API keeps a copy of the profile with the session in Redis and rebuilds it only
on `POST /auth/refresh`, which works only for "Keep me signed in" sessions. After a self-service
change, `useSyncSelfSession` (in `hooks/`) updates the in-app profile. For remembered
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
  `parseInviteCode` (`api/invite.ts`). The form posts to `POST /invite/join/{code}`,
  which needs no session and answers 200 with no body, so the new user is sent to sign in with the
  username filled in. The API takes the full create-user body but uses the invitation's email, role
  and policy, so those fields are placeholders. Sending and revoking invitations is Admin ›
  Invitations (`api/invitations.ts`).
- **Overview dashboard**: tag filters use the real `GET /tag/list`. Fleet, approvals, workflow, and
  alert data expects one aggregate `GET /dashboard/overview`. Actions not wired up yet show a toast
  instead of failing silently.
- Other sidebar sections render the shared `ComingSoonPage`.
- **Admin** (users, roles, API keys, audit logs, organization) and **Vault** (projects, secrets,
  config files, notes): the Main API has no endpoints for these yet, so their `src/api/`
  modules call an in-memory fake backend in `src/data/` (`mockAdmin.ts`, `mockVault.ts`, shared
  `mockHelpers.ts`). Their pages show a "Mock data" badge, and the data resets on reload. Anything
  shared between the mocks lives in `src/data/mockHelpers.ts`.

If you add the real backend for one of these, remove the fallback handling in the matching
`src/api/` module.

## Theming

Light, dark, and system modes come from `src/store/theme.ts` (a Jotai atom persisted to
`localStorage`) and `<html data-theme>`. All colors are CSS variables in `src/index.css`
(`--color-ink`, `--color-signal`, `--color-warning`, …), with the dark default and the light
override defined together. Use these tokens instead of hard-coded colors. The loader styles map
their colors onto them at the top of `src/assets/styles/n-loading.css`, so they follow the theme too.

Fonts are IBM Plex Sans and IBM Plex Mono (SIL Open Font License), bundled with the app from the
`@fontsource` packages (Latin subset, only the weights in use), so the app makes no requests to an
outside font service.

## Runtime configuration

On container start, `docker/write-env.mjs` writes `dist/env.js` (`window.__NOPS_ENV__ = {...}`)
from the container's environment. `index.html` loads that file before the app, and
`src/utils/env.ts` prefers it over the `VITE_*` build values. This lets one image run anywhere:
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
