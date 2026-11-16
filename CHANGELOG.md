# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). It has no tagged releases yet.

## [Unreleased]

### Added

- Account page: verify your email with an emailed one-time code.
- Account page: change your username, with a live availability check.
- Account page: change your password and deactivate your account.
- Account page: edit free-form profile details.
- The signed-in profile now survives page reloads.
- Opt-in live contract test against a running Main API (`test/integration`).
- Community files: contributing guide, security policy, code of conduct, issue and pull request
  templates.

### Changed

- The top bar stays fixed at the top while the page scrolls.
- API errors keep their HTTP status, and short plain-text error bodies are shown as the message.
- Shared components now all follow the atomic layout. The auth and loading components moved into
  the atoms, molecules, organisms, and templates folders.
- The in-memory demo data for Admin and Vault moved from inside each feature to `src/mocks/`, so
  the Vault feature no longer depends on the Admin feature.

### Fixed

- One-time code inputs accept letters when the API's code alphabet includes them.
