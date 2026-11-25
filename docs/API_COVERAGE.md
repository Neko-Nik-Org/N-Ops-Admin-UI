# API coverage

Which [N-Ops Main API](https://github.com/Neko-Nik-Org/N-Ops-Main-API) endpoints the Admin UI uses,
and what is still missing on either side. Checked against the Main API's `src/main.rs` on 2026-11-25
(up to commit `ca8bdf9`).

**Legend:** ✅ used by the UI · ⏳ the UI is ready and waits for the API · 🧪 the UI runs on mock data
(`src/data/`) because the API has no endpoint yet

## 1. Released endpoints: all are used by the UI

Every route registered in the Main API is wired into the UI. The UI file that calls each one is listed.

### Health and auth

| Endpoint              | UI                  | Where it shows                                |
| --------------------- | ------------------- | --------------------------------------------- |
| `GET /health/service` | ✅ `api/health.ts`  | Startup check, sidebar health indicator       |
| `POST /auth/login`    | ✅ `api/login.ts`   | Sign-in                                       |
| `GET /auth/verify`    | ✅ `api/session.ts` | Session check on load                         |
| `POST /auth/refresh`  | ✅ `api/session.ts` | "Keep me signed in" sessions                  |
| `GET /auth/session`   | ✅ `api/session.ts` | Account › Devices (is the mobile app allowed) |
| `DELETE /auth/logout` | ✅ `api/session.ts` | Sign out                                      |

### Signed-in user (`/user/self`)

| Endpoint                                | UI                  | Where it shows                                                        |
| --------------------------------------- | ------------------- | --------------------------------------------------------------------- |
| `GET /user/self/profile`                | ✅ `api/account.ts` | Startup, Account › Profile                                            |
| `PUT /user/self/profile`                | ✅ `api/account.ts` | Account › Profile › Edit profile                                      |
| `GET` / `POST /user/self/ui-info`       | ✅ `api/account.ts` | Theme, sidebar, tag, Vault view, last page (sent at most every 5 min) |
| `GET` / `POST /user/self/details`       | ✅ `api/account.ts` | Account › Profile › Profile details                                   |
| `GET /user/self/org-info`               | ✅ `api/account.ts` | Account › Organization, Admin › Organization                          |
| `POST /user/self/verify-email/send`     | ✅ `api/account.ts` | Verify email dialog                                                   |
| `POST /user/self/verify-email/validate` | ✅ `api/account.ts` | Verify email dialog                                                   |
| `GET /user/self/user-name/check/{name}` | ✅ `api/account.ts` | Live "username available" checks                                      |
| `POST /user/self/change-username`       | ✅ `api/account.ts` | Account › Profile › Change username                                   |
| `POST /user/self/change-password`       | ✅ `api/account.ts` | Account › Security › Change password                                  |
| `DELETE /user/self/deactivate`          | ✅ `api/account.ts` | Account › Security › Deactivate                                       |
| `GET /user/self/anti-phishing-secret`   | ✅ `api/account.ts` | Account › Security (loaded only when shown)                           |
| `PUT /user/self/anti-phishing-secret`   | ✅ `api/account.ts` | Account › Security › Change secret                                    |

### User admin (`/user/admin`)

| Endpoint                                     | UI                | Where it shows                   |
| -------------------------------------------- | ----------------- | -------------------------------- |
| `GET /user/admin/list`                       | ✅ `api/users.ts` | Admin › Users                    |
| `GET /user/admin/fetch/{id}`                 | ✅ `api/users.ts` | User details                     |
| `POST /user/admin/create`                    | ✅ `api/users.ts` | Add user                         |
| `PUT /user/admin/update/{id}`                | ✅ `api/users.ts` | Edit user (name, email, details) |
| `PUT /user/admin/role/{id}/assign/{role_id}` | ✅ `api/users.ts` | Edit user (role)                 |
| `PUT /user/admin/ar-policy/{id}/assign`      | ✅ `api/users.ts` | Edit user (access policy)        |
| `PUT /user/admin/change-username/{id}`       | ✅ `api/users.ts` | Rename user                      |
| `PUT /user/admin/reset/password/{id}`        | ✅ `api/users.ts` | Reset password                   |
| `PATCH /user/admin/verify-email/{id}`        | ✅ `api/users.ts` | Mark email verified              |
| `PATCH /user/admin/deactivate/{id}`          | ✅ `api/users.ts` | Deactivate user                  |
| `DELETE /user/admin/delete/{id}`             | ✅ `api/users.ts` | Delete user                      |

### Roles, access policies, tags, invitations

| Endpoint                                                         | UI                         | Where it shows                    |
| ---------------------------------------------------------------- | -------------------------- | --------------------------------- |
| `GET /user/roles/list`, `GET /user/roles/fetch/{id}`             | ✅ `api/roles.ts`          | Admin › Roles                     |
| `POST /user/roles/create`                                        | ✅ `api/roles.ts`          | New role                          |
| `PATCH /user/roles/update/info/{id}`                             | ✅ `api/roles.ts`          | Edit role                         |
| `PUT /user/roles/update/permissions/{id}`                        | ✅ `api/roles.ts`          | Edit role (permissions)           |
| `DELETE /user/roles/delete/{id}`                                 | ✅ `api/roles.ts`          | Delete role                       |
| `GET /policy/access-restriction/list`, `/get/{id}`               | ✅ `api/accessPolicies.ts` | Admin › Access policies           |
| `POST /policy/access-restriction/create`                         | ✅ `api/accessPolicies.ts` | New policy                        |
| `PUT` / `PATCH /policy/access-restriction/update/{id}`           | ✅ `api/accessPolicies.ts` | Edit policy                       |
| `GET /policy/access-restriction/check/{id}`                      | ✅ `api/accessPolicies.ts` | Delete impact (users on it)       |
| `DELETE /policy/access-restriction/delete/{id}`                  | ✅ `api/accessPolicies.ts` | Delete policy                     |
| `GET /tag/list`, `GET /tag/get/{id}`                             | ✅ `api/tags.ts`           | Tag picker, Admin › Tags          |
| `POST /tag/create`, `PUT /tag/update`, `DELETE /tag/delete/{id}` | ✅ `api/tags.ts`           | Admin › Tags                      |
| `GET /invite/list`                                               | ✅ `api/invitations.ts`    | Admin › Invitations               |
| `POST /invite/new`                                               | ✅ `api/invitations.ts`    | Invite someone                    |
| `DELETE /invite/delete/{id}`                                     | ✅ `api/invitations.ts`    | Revoke invitation                 |
| `POST /invite/join/{code}`                                       | ✅ `api/invite.ts`         | `/invite?code=…` (4-step sign-up) |

### Devices (`/user/devices`, mobile app sign-in)

Any signed-in user, for their own devices; no permission is needed. Whether a user may link the app
at all comes from their access policy's `allow_device_logins` rule.

| Endpoint                               | UI                  | Where it shows                                                            |
| -------------------------------------- | ------------------- | ------------------------------------------------------------------------- |
| `POST /user/devices/generate`          | ✅ `api/devices.ts` | Account › Devices › Get a code (user ID + one-time code, 5 min countdown) |
| `GET /user/devices/check/device-token` | ✅ `api/devices.ts` | Polled every 3 s while a code is shown; "code still waiting" notice       |
| `DELETE /user/devices/revoke`          | ✅ `api/devices.ts` | Cancel code, and when the countdown ends                                  |
| `GET /user/devices/list`               | ✅ `api/devices.ts` | Account › Devices › Linked devices                                        |
| `GET /user/devices/get/{id}`           | ✅ `api/devices.ts` | Device details dialog                                                     |
| `DELETE /user/devices/delete/{id}`     | ✅ `api/devices.ts` | Remove device                                                             |

`POST /auth/device/login` is for the mobile app, not this UI. It takes `user_id`, `device_token`,
`device_name`, `device_type`, `device_identifier` and `device_details`, and answers with a
`refresh_token`. That is why the Devices page shows the user ID next to the code, and a QR code
the app can scan instead (`src/utils/deviceLink.ts`). The QR code holds compact JSON:

```json
{ "type": "n-ops-device-link", "version": 1, "api": "https://api.example.com", "user_id": 2, "device_token": "…" }
```

`api` is the absolute API base URL without a trailing slash. The app should reject other `type`s and
ask for an update on a `version` it doesn't know.

The access policy endpoints also send and take `allow_device_logins` now. It is the "Allow the
mobile app" switch on the policy form, and shows on the policy page and in the form summary.

### Super admin (`/super-admin/organization`, admin key)

| Endpoint                                                                                    | UI                        |
| ------------------------------------------------------------------------------------------- | ------------------------- |
| `GET /list`, `GET /get/{id}`, `GET /check-name/{name}`                                      | ✅ `api/organizations.ts` |
| `POST /create`, `DELETE /delete/{id}`                                                       | ✅ `api/organizations.ts` |
| `PUT /state/{id}/{is_active}`                                                               | ✅ `api/organizations.ts` |
| `PUT /update/name/{id}`, `/update/basic/{id}`, `/update/billing/{id}`, `/update/quota/{id}` | ✅ `api/organizations.ts` |
| `POST /invite/{id}/admin`                                                                   | ✅ `api/organizations.ts` |

### Vault projects

| Endpoint                                                                                            | UI                        |
| --------------------------------------------------------------------------------------------------- | ------------------------- |
| `GET /vault/project/list`, `GET /vault/project/detail/{id}`                                         | ✅ `api/vaultProjects.ts` |
| `POST /vault/project/create`, `PUT /vault/project/update/{id}`, `DELETE /vault/project/delete/{id}` | ✅ `api/vaultProjects.ts` |

## 2. Left to do: the UI is ready, the API isn't

These screens are built. Each calls the endpoint it expects (⏳) or a mock backend (🧪) and shows a
clear "not available yet" state or a "Mock data" badge. When the API ships one, check its request and
response shape against the UI file and remove the fallback.

| Feature                         | Endpoint(s) the UI expects                                                                | Status | UI file                     | API status                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ------ | --------------------------- | ---------------------------------------------------------------------------------- |
| Mobile app session refresh      | device refresh and device logout                                                          | n/a    | mobile app, not this UI     | commented out in `main.rs` (`POST /auth/device/login` is live)                     |
| 2FA at sign-in                  | `POST /auth/verify-otp`, `POST /auth/resend-otp`                                          | ⏳     | `api/twoFactor.ts`          | commented out in `main.rs`                                                         |
| Turning on 2FA (security setup) | `POST /user/2fa/email`, `/user/2fa/totp`, `/user/2fa/totp/entries`, `/entries/{id}/check` | ⏳     | `api/twoFactorSetup.ts`     | `/mfa` scope commented out (names differ: `set_email_2fa`, `create_totp_entry`, …) |
| Forgot / reset password         | none yet (page explains to ask an admin)                                                  | ⏳     | `pages/auth/forgotPassword` | `auth::forgot_password` / `reset_password` commented out                           |
| Overview dashboard              | `GET /dashboard/overview`                                                                 | ⏳     | `api/dashboard.ts`          | not started                                                                        |
| API keys                        | create, update, delete, list, get                                                         | 🧪     | `api/apiKeys.ts`            | `/api-keys` scope commented out                                                    |
| Vault env keys (secrets)        | create, versions, set active version, list, get                                           | 🧪     | `api/vaultSecrets.ts`       | `/vault/secret/keys` scope commented out                                           |
| Vault config files              | list, versions, save, roll back                                                           | 🧪     | `api/vaultConfigs.ts`       | not started                                                                        |
| Vault notes                     | list, create, update, delete                                                              | 🧪     | `api/vaultNotes.ts`         | not started                                                                        |
| Vault folder contents           | counts per project                                                                        | 🧪     | `api/vaultContents.ts`      | not started                                                                        |
| Audit logs                      | list, export, export schedules                                                            | 🧪     | `api/auditLogs.ts`          | not started                                                                        |
| Workflows                       | list, detail, runs, servers                                                               | 🧪     | `api/workflows.ts`          | not started                                                                        |

## 3. Not built in the UI yet

Sidebar sections that open the "Coming soon" page, with no UI and no API: **Servers**, **Tools**,
**Service management › Postgres**, **Approvals**, **Metrics**, **Service logs**.

## Known API issues found while wiring the UI

Reported, not fixed in the UI (the UI must not change the Main API):

- `GET /invite/list` has no `ORDER BY`, so the order can change between loads (the UI sorts by date).
- `PUT /user/admin/ar-policy/{id}/assign` with no policy doesn't clear it, and the assign endpoints
  answer 204 even when nothing changed (the UI reads the user back to check).
- `POST /invite/join/{code}` needs the full create-user body, but ignores role, policy and email
  (the UI sends placeholders).
- The super-admin "invite admin" route doesn't check for an existing invitation for that email.
- `PUT /user/self/anti-phishing-secret` checks length in bytes (`len()`) but characters with Rust's
  Unicode `is_alphanumeric()`, so non-ASCII letters count double. The UI only allows ASCII
  letters, digits, `-` and `_`.
- `POST /auth/device/login` deletes the code on any attempt, so one typo uses it up. The UI can only
  tell that the code is gone, so it checks the device list to say whether linking worked. Device
  refresh and logout are still commented out, so a phone gets a refresh token it can't use yet.
- `POST /user/devices/generate` answers 403 both when the policy forbids the app and when a code is
  already waiting, so only the message tells them apart (the UI uses `/auth/session` and the
  waiting-code check to word it).
- `allow_device_logins` is required in the policy create and PATCH bodies (no serde default), so
  clients that don't send it get a 400. The UI sends it now.
- `allow_device_logins` comes only from `GET /auth/session`, a copy made at sign-in. After an admin
  changes the user's policy, the Devices page (and the API's own check) follow the old rule until
  the user signs in again.
- Device sessions: `last_accessed_at` is never updated (`update_last_accessed_at` is a TODO), and
  nothing removes devices unused for 7 days as the schema comment plans. `/list` has no `ORDER BY`
  (the UI sorts by last use). `/get/{id}` answers 200 with `null` for an unknown id, and
  `/delete/{id}` answers 204 even when nothing was deleted.
- `GET /user/devices/check/device-token` doesn't check `allow_device_logins`, unlike generate and
  revoke (harmless, it only answers false).

Keep this file up to date when an endpoint is added on either side.
