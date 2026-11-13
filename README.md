# N-Ops Admin UI

**Web admin console for [N-Ops](https://nops.app), the open-source infrastructure control plane by Neko Nik, in partnership with YSPL.**

> One platform. Complete infrastructure control.

- Admin UI repository: https://github.com/Neko-Nik-Org/N-Ops-Admin-UI
- Backend (Main API): https://github.com/Neko-Nik-Org/N-Ops-Main-API
- Project: N-Ops
- Component: Admin UI / web frontend

## Project status

N-Ops is an evolving project, and this UI changes along with the
[Main API](https://github.com/Neko-Nik-Org/N-Ops-Main-API). Some screens are fully wired to the
backend, and others are placeholders for planned features. Each one says so in the UI and never
shows invented data. Check the table below and the source for what works today.

| Area | Status |
|---|---|
| Sign in (username + password, Cloudflare Turnstile, remember me) | ✅ Live (`/auth/login`, `/auth/verify`, `/auth/refresh`, `/auth/logout`) |
| Two-factor sign-in (TOTP / email code) | 🚧 UI ready, backend endpoints not released yet |
| Tags (list, create, edit, delete, permission-aware) | ✅ Live (`/tag/*`) |
| Account (profile, preferences, organization quotas) | ✅ Live (`/user/self/*`) |
| Invite acceptance | 🚧 UI ready, backend not built yet |
| Overview dashboard (fleet, approvals, alerts) | 🚧 Layout ready, waiting on backend |
| Servers, Vault, Tools, Approvals, Metrics, Workflows, Service management/logs | 📋 Planned ("Coming soon" pages) |

## Features

- Light, dark, and system themes
- Responsive layout (on mobile the sidebar becomes a drawer)
- Permission-aware UI that mirrors the Main API's RBAC and tag scoping
- Runtime configuration: one Docker image runs against any backend, no rebuild needed
- Session tokens sent in the `x-nops-token` header, with no cookies used for API auth

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · TanStack Query · Jotai · React Router ·
React Hook Form + Yup · Recharts · Vitest + Testing Library · oxlint

## Quick start

### Requirements

- Node.js 22+ and npm
- A running [N-Ops Main API](https://github.com/Neko-Nik-Org/N-Ops-Main-API), whose
  `ALLOWED_ORIGINS` includes this UI's origin (for example `http://localhost:5173`)

### Local development

```bash
git clone https://github.com/Neko-Nik-Org/N-Ops-Admin-UI.git
cd N-Ops-Admin-UI
cp .env.example .env    # set VITE_API_BASE_URL and VITE_TURNSTILE_SITE_KEY
npm install
npm run dev             # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with oxlint |
| `npm run typecheck` | Run the TypeScript checks |
| `npm run test` | Run the test suite (Vitest) |

### Docker

Images are published to Docker Hub as
[`neko7nik/n-ops-admin-ui`](https://hub.docker.com/r/neko7nik/n-ops-admin-ui).

```bash
cp .env.example .env    # set API_BASE_URL and TURNSTILE_SITE_KEY
docker compose up -d    # serves on http://127.0.0.1:8080
```

To build the image yourself, run `docker build -t neko7nik/n-ops-admin-ui:latest .`.

The container binds to `127.0.0.1` only. In production, put a reverse proxy (nginx, Caddy,
Cloudflare Tunnel, …) in front of it to handle TLS.

## Configuration

The container reads its settings **when it starts**; none are baked into the build:

| Docker (`.env` / compose) | Local dev (`.env`, Vite) | Description |
|---|---|---|
| `API_BASE_URL` | `VITE_API_BASE_URL` | Main API base URL, no trailing slash. **Required.** |
| `TURNSTILE_SITE_KEY` | `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for the login widget. **Required.** |
| — | `DEV_ALLOWED_HOSTS` | Optional. Extra dev-server hostnames, comma-separated (e.g. when tunnelling). |

The container won't start if a required value is missing. `.env.example` uses Cloudflare's
always-pass **test** Turnstile key. For production, get a real site key scoped to your admin domain.

## Documentation

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): architecture, project layout, the auth flow, theming,
  runtime config internals, and CI/CD
- [N-Ops Main API](https://github.com/Neko-Nik-Org/N-Ops-Main-API): backend, API, and permissions
  reference

## Security

This UI is the front door to infrastructure credentials and privileged operations. Until a security
review and production-readiness statement are published, evaluate it carefully before using it
for production infrastructure.

- Report security vulnerabilities privately through
  [GitHub Security Advisories](https://github.com/Neko-Nik-Org/N-Ops-Admin-UI/security/advisories/new),
  not in public issues.
- **Never post real production secrets, session tokens, private keys, or credentials in issues,
  pull requests, or public discussions.**

## Contributing

Contributions, bug reports, feature proposals, and documentation improvements are welcome.

1. Check the existing issues first. For larger changes, open an issue to discuss the approach.
2. Fork the repo and create a branch from `main`.
3. Follow the project layout in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Tests go in `test/`,
   mirroring `src/`.
4. Make sure `npm run lint && npm run typecheck && npm run test && npm run build` passes. CI runs
   the same checks on every pull request.
5. Open a pull request with a clear description and, for UI changes, screenshots.

When reporting a bug, include reproduction steps, your browser, the UI version or commit, and any
relevant console or network output **with secrets removed**.

## Community

- Website: https://nops.app
- Organization: https://github.com/Neko-Nik-Org

## License

This project is released under the GNU General Public License v3.0. See [LICENSE](LICENSE) for
details.
