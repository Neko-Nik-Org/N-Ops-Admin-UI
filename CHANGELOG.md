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
- Super Admin pages at `/super-admin`: every organization with its plan limits and usage, and one
  organization's details. Unlocked with the API's admin key, which is kept encrypted and removed as
  soon as you're on any other page.
- Admin › Users: add users, change a username, reset a password, mark an email verified, deactivate
  and delete users. Users and their details come from the live API.
- Accepting an invitation: the emailed link opens a create-account page with who invited you and
  where; you pick your name, username and password, then sign in.
- Super Admin: invite an organization's first admin by email.
- Super Admin: an organization's profile is a form with set fields (legal name, description, website,
  industry, size, contacts including support and security emails, phone, country, time zone,
  address). Older free-form values stay editable under "Other fields". The organization's own pages
  show these fields with readable labels.
- Admin › Users: edit someone's name, email and profile details, and change their role and access
  policy. Users show their access policy (its 2FA and sign-in limits) instead of per-user IP and
  country fields, and Add user picks an access policy. Add user can also fill in the new user's
  profile details (work, contact, availability, engineering), in a section that starts collapsed.
- Admin › Invitations: invite someone by email with a role, an optional access policy, an expiry
  (1 hour to 21 days) and a note, see pending and expired invitations, and revoke them. Roles can
  grant the new View / Send / Revoke invitations permissions.
- Admin › Roles: permissions as a View / Create / Edit / Delete matrix, and a read-only role view.
- Vault: inside a project, Env, Conf and Notes are tabs.
- Workflows: list and detail pages with the flow diagram and run history (sample data until the API
  has workflow endpoints).
- Profile details have a structure: work, contact, availability, engineering (including SSH public
  keys) and your own fields. Older free-form details are carried over.
- Your last page is remembered and you return to it after signing in again. Sidebar, selected tag
  and Vault view follow you across devices.
- Everything the app saves in the browser is encrypted (AES-GCM with a non-extractable key).
- Low-power mode for older machines: no decorative animation or blur.

### Changed

- The top bar stays fixed at the top while the page scrolls.
- Admin › Access policies: allowed IPs are added from one input (+ or Enter) and listed below it,
  each with the range it covers. IPv4 and IPv6 addresses and CIDR ranges are checked with ipaddr.js
  the way the API checks them; a range like 203.0.113.5/24 is refused with a one-click fix
  (203.0.113.0/24), and pasting a list adds every valid entry.
- Access policies: the country picker lists all 250 countries; it used to stop after the first 100
  (around Honduras) unless you typed.
- Admin › Access policies: viewing, creating, duplicating and editing a policy each open their own
  page (`/admin/access-policies/<id>`, `/new`, `/new?from=<id>`, `/<id>/edit`) instead of a popup,
  so they can be linked and bookmarked. Deleting still asks in a dialog.
- Pages no longer show their name as a large title (the sidebar shows which page is open). Screen readers
  still hear it. Pages about one item (an organization, a workflow) still show its name.
- API errors keep their HTTP status, and short plain-text error bodies are shown as the message.
- Shared components now all follow the atomic layout. The auth and loading components moved into
  the atoms, molecules, organisms, and templates folders.
- The in-memory demo data for Admin and Vault moved from inside each feature to `src/mocks/`, so
  the Vault feature no longer depends on the Admin feature.
- API errors show their error code, e.g. "(E221)".
- Faster loading on slow connections: smaller first download, startup requests in parallel, page
  code loaded on demand, and fonts bundled instead of loaded from Google Fonts.
- One CI/CD workflow that builds the Docker image once, then pushes and deploys that image.
- Editing roles needs `user:role:edit`, matching the API.
- Toasts show above open dialogs, without a countdown bar.
- Dialogs and toasts no longer use the browser's top layer, so password managers (Bitwarden's inline
  menu and "Save login" prompt) show above them instead of being covered and switching themselves
  off.
- Collapsing and expanding the sidebar animates smoothly.

### Fixed

- One-time code inputs accept letters when the API's code alphabet includes them.
- Data cached for one account is cleared on sign-out, so the next account on the same browser
  never sees it.
- A dialog opened on top of another one is announced with its own title.
