# Contributing to N-Ops Admin UI

Thanks for helping. Bug reports, feature proposals, documentation fixes, and code are all welcome.
By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

> **Security issues:** do not open a public issue. Follow [SECURITY.md](SECURITY.md) instead.

## Before you start

- Search the [existing issues](https://github.com/Neko-Nik-Org/N-Ops-Admin-UI/issues) first.
- For anything bigger than a small fix, open an issue to agree on the approach before writing code.
- This UI follows the [N-Ops Main API](https://github.com/Neko-Nik-Org/N-Ops-Main-API). A change that
  needs a new or different endpoint usually starts in that repository.

## Set up

Requirements: Node.js 22 (see `.nvmrc`) and npm.

```bash
git clone https://github.com/Neko-Nik-Org/N-Ops-Admin-UI.git
cd N-Ops-Admin-UI
cp .env.example .env    # set VITE_API_BASE_URL and VITE_TURNSTILE_SITE_KEY
npm install
npm run dev             # http://localhost:5173
```

## Make your change

1. Fork the repository and branch from `main`, e.g. `fix/otp-paste` or `feat/user-invites`.
2. Follow the layout and conventions in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md):
   - shared UI goes in `src/components/` (atoms → molecules → organisms → templates);
   - feature logic goes in `src/features/<name>/` (`api/`, `hooks/`, `schema/`, `store/`, `types.ts`);
   - tests go in `test/`, mirroring `src/`;
   - every source file starts with the GPL-3.0 license header used in the existing files.
3. Add or update tests for what you changed.
4. Format and check your work. CI runs the same checks on every pull request:

   ```bash
   npm run format
   npm run lint && npm run typecheck && npm run test && npm run build
   ```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add email verification to the account page
fix: keep the top bar visible while scrolling
docs: explain the live contract test
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.

## Open a pull request

- Describe what changed and why, and link the issue (`Closes #123`).
- Include screenshots or a short recording for UI changes, in both light and dark themes if colors changed.
- Keep pull requests focused. Unrelated clean-ups belong in their own pull request.
- Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for user-visible changes.

## Report a bug

Use the bug report template. Include steps to reproduce, your browser, the UI version or commit,
and any console or network output **with tokens, secrets, and personal data removed**.

## License

By contributing, you agree that your contributions are licensed under the
[GNU General Public License v3.0](LICENSE), the same license as the project.
