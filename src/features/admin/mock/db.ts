/*
 * Copyright (C) 2026 Neko Nik <nikhil@nekonik.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */
/**
 * In-memory mock backend for the Admin section.
 *
 * The API has no admin, role, API-key or audit endpoints yet (they are commented out in
 * N-Ops-Main-API/src/main.rs), so ../api/*.ts call this instead. It behaves like a small server:
 * it keeps data for the session, enforces the schema's unique names, adds a short delay, and
 * records every change in the audit log. Reloading the page resets it.
 *
 * Tag ids 1–4 stand for production, staging, development and internal.
 */

import moment from 'moment'
import { ALL_PERMISSIONS, AUDIT_ACTIONS, AUDIT_RETENTION_DAYS } from '../catalog'
import type {
  AdminUser,
  ApiKey,
  AuditActor,
  AuditExportSchedule,
  AuditLog,
  AuditOutcome,
  Organization,
  Role,
} from '../types'

/** Pretend network latency; none under test so the suite stays fast. */
export const mockDelay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 0 : 200 + Math.random() * 250))

/** Small deterministic PRNG (mulberry32), so the generated history is the same on every load. */
const prng = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const ago = (amount: number, unit: moment.unitOfTime.DurationConstructor) => moment().subtract(amount, unit).toISOString()

const viewOnly = ALL_PERMISSIONS.filter((p) => p.endsWith(':view'))

const seedRoles = (): Role[] => [
  {
    roleId: 1,
    roleName: 'Owner',
    roleDescription: 'Full control of the organization, including billing and other admins.',
    permissions: [...ALL_PERMISSIONS],
    tagIds: [],
    canApproveApprovals: true,
    canBypassApprovals: true,
    allowedLinuxUsers: ['root', 'deploy'],
    createdAt: ago(240, 'days'),
    updatedAt: ago(240, 'days'),
  },
  {
    roleId: 2,
    roleName: 'Admin',
    roleDescription: 'Manages people, roles, keys and every resource, but not the organization itself.',
    permissions: ALL_PERMISSIONS.filter((p) => p !== 'org:edit'),
    tagIds: [],
    canApproveApprovals: true,
    canBypassApprovals: false,
    allowedLinuxUsers: ['deploy'],
    createdAt: ago(240, 'days'),
    updatedAt: ago(60, 'days'),
  },
  {
    roleId: 3,
    roleName: 'Operator',
    roleDescription: 'Runs production and staging: SSH, commands and workflows.',
    permissions: ['tag:view', 'server:view', 'server:ssh', 'server:exec', 'vault:keys:view', 'vault:config:view', 'workflow:view', 'workflow:run'],
    tagIds: [1, 2],
    canApproveApprovals: false,
    canBypassApprovals: false,
    allowedLinuxUsers: ['deploy', 'ubuntu'],
    createdAt: ago(200, 'days'),
    updatedAt: ago(14, 'days'),
  },
  {
    roleId: 4,
    roleName: 'Developer',
    roleDescription: 'Reads secrets and configs for staging and development.',
    permissions: ['tag:view', 'server:view', 'vault:keys:view', 'vault:notes:view', 'vault:config:view', 'workflow:view'],
    tagIds: [2, 3],
    canApproveApprovals: false,
    canBypassApprovals: false,
    allowedLinuxUsers: ['ubuntu'],
    createdAt: ago(200, 'days'),
    updatedAt: ago(30, 'days'),
  },
  {
    roleId: 5,
    roleName: 'Auditor',
    roleDescription: 'Read-only access to everything, plus audit log export.',
    permissions: [...viewOnly, 'audit:export'],
    tagIds: [],
    canApproveApprovals: false,
    canBypassApprovals: false,
    allowedLinuxUsers: [],
    createdAt: ago(120, 'days'),
    updatedAt: ago(120, 'days'),
  },
  {
    roleId: 6,
    roleName: 'CI deploy',
    roleDescription: 'For pipelines: reads secret keys and config files, nothing else.',
    permissions: ['vault:keys:view', 'vault:config:view'],
    tagIds: [1],
    canApproveApprovals: false,
    canBypassApprovals: false,
    allowedLinuxUsers: [],
    createdAt: ago(90, 'days'),
    updatedAt: ago(90, 'days'),
  },
]

/** [userName, displayName, roleId, active, verified, totp, email2fa, ipRestricted, lastLogin days ago (null = never)] */
const USER_ROWS: Array<[string, string, number, boolean, boolean, boolean, boolean, boolean, number | null]> = [
  ['neko', 'Neko Nik', 1, true, true, true, false, false, 0],
  ['priya', 'Priya Rao', 2, true, true, true, true, false, 0.2],
  ['marcus', 'Marcus Chen', 3, true, true, true, false, true, 1],
  ['aisha', 'Aisha Bello', 3, true, true, false, true, false, 2],
  ['tomas', 'Tomás Ruiz', 4, true, true, false, false, false, 3],
  ['lena', 'Lena Fischer', 4, true, true, true, false, false, 6],
  ['kenji', 'Kenji Watanabe', 4, true, false, false, false, false, null],
  ['olivia', 'Olivia Hart', 5, true, true, true, false, false, 12],
  ['dev', 'Dev Malhotra', 3, false, true, false, false, false, 41],
  ['sara', 'Sara Lindqvist', 4, true, true, false, true, false, 0.5],
]

const seedUsers = (): AdminUser[] =>
  USER_ROWS.map(([userName, displayName, roleId, isActive, isEmailVerified, hasTotp2fa, hasEmail2fa, hasIpRestriction, lastLogin], i) => ({
    userId: i + 1,
    userName,
    displayName,
    primaryEmail: `${userName}@acme.dev`,
    roleId,
    isActive,
    isEmailVerified,
    hasTotp2fa,
    hasEmail2fa,
    hasIpRestriction,
    allowedIps: hasIpRestriction ? ['203.0.113.0/24', '198.51.100.7'] : [],
    createdAt: ago(230 - i * 18, 'days'),
    lastLoginAt: lastLogin === null ? null : ago(lastLogin * 24, 'hours'),
  }))

const seedApiKeys = (): ApiKey[] => [
  {
    apiKeyId: 1,
    keyName: 'github-actions-prod',
    keyDescription: 'Production deploys from GitHub Actions read secrets at release time.',
    keyPrefix: 'nk-1_Qm7v',
    roleId: 6,
    tagId: 1,
    isActive: true,
    createdAt: ago(80, 'days'),
    updatedAt: ago(80, 'days'),
    expiresAt: moment().add(100, 'days').toISOString(),
    lastUsedAt: ago(3, 'hours'),
  },
  {
    apiKeyId: 2,
    keyName: 'staging-config-sync',
    keyDescription: 'Nightly job that pulls staging config files.',
    keyPrefix: 'nk-2_x9Lp',
    roleId: 4,
    tagId: 2,
    isActive: true,
    createdAt: ago(45, 'days'),
    updatedAt: ago(10, 'days'),
    expiresAt: null,
    lastUsedAt: ago(9, 'hours'),
  },
  {
    apiKeyId: 3,
    keyName: 'grafana-agent',
    keyDescription: 'Reads the metrics token for the internal Grafana agent.',
    keyPrefix: 'nk-3_bT2e',
    roleId: 6,
    tagId: 4,
    isActive: true,
    createdAt: ago(30, 'days'),
    updatedAt: ago(30, 'days'),
    expiresAt: moment().add(6, 'days').toISOString(),
    lastUsedAt: ago(1, 'days'),
  },
  {
    apiKeyId: 4,
    keyName: 'old-jenkins',
    keyDescription: 'Legacy Jenkins pipeline. Disabled after the move to GitHub Actions.',
    keyPrefix: 'nk-4_Hc0s',
    roleId: 6,
    tagId: 1,
    isActive: false,
    createdAt: ago(200, 'days'),
    updatedAt: ago(70, 'days'),
    expiresAt: ago(5, 'days'),
    lastUsedAt: ago(72, 'days'),
  },
]

const seedOrganization = (): Organization => ({
  organizationId: '7c1e2d4a-5b9f-4e2a-9d1c-3f8e6a2b0c11',
  organizationName: 'Acme',
  info: {
    description: 'Payments platform for independent retailers.',
    website: 'https://acme.dev',
    contactEmail: 'ops@acme.dev',
    timezone: 'Asia/Kolkata',
  },
  isActive: true,
  createdAt: ago(240, 'days'),
  limits: { users: 25, servers: 50, workflows: 20, vaultProjects: 10, vaultKeysPerProject: 200, vaultNotesPerProject: 100 },
  usage: { users: USER_ROWS.length, servers: 23, workflows: 6, vaultProjects: 4 },
  aiCredit: { used: 18_250, allocated: 50_000 },
  storageBytes: { used: 3.4 * 1024 ** 3, allocated: 20 * 1024 ** 3 },
})

const seedSchedules = (): AuditExportSchedule[] => [
  {
    scheduleId: 1,
    frequency: 'weekly',
    format: 'csv',
    recipients: ['security@acme.dev'],
    enabled: true,
    workflowName: 'Weekly audit export',
    lastRunAt: ago(3, 'days'),
    nextRunAt: moment().add(4, 'days').startOf('day').add(6, 'hours').toISOString(),
  },
]

const IPS = ['203.0.113.24', '203.0.113.87', '198.51.100.7', '192.0.2.144', '10.0.4.12', '10.0.8.31']
const RESOURCES: Record<string, string[]> = {
  vault: ['payments-api / STRIPE_SECRET', 'payments-api / DATABASE_URL', 'web / NEXT_PUBLIC_KEY', 'billing / .env.production'],
  server: ['web-1', 'web-2', 'db-primary', 'worker-3', 'staging-app-1'],
  workflow: ['Nightly backup', 'Health check', 'Mail queue watch', 'Weekly audit export'],
  approval: ['#R-12 restart nginx', '#R-15 rotate DB password', '#R-19 apt upgrade', '#R-22 drop staging cache'],
  tag: ['production', 'staging', 'development', 'internal'],
}

/** Builds ~90 days of believable history: busy weekdays, quiet weekends, mostly sign-ins and reads. */
const seedAuditLogs = (users: AdminUser[], keys: ApiKey[], roles: Role[]): AuditLog[] => {
  const rand = prng(20261114)
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!
  const weighted: Array<[string, number]> = [
    ['auth.login', 26],
    ['auth.login_failed', 3],
    ['auth.logout', 8],
    ['vault.secret_reveal', 12],
    ['vault.config_read', 8],
    ['server.ssh_session', 10],
    ['server.command', 9],
    ['api_key.use', 12],
    ['workflow.run', 7],
    ['approval.approve', 3],
    ['approval.reject', 1],
    ['user.update', 1],
    ['role.update', 1],
    ['tag.update', 1],
    ['audit.export', 1],
  ]
  const total = weighted.reduce((sum, [, w]) => sum + w, 0)
  const pickAction = () => {
    let r = rand() * total
    for (const [action, w] of weighted) if ((r -= w) < 0) return action
    return 'auth.login'
  }
  const activeUsers = users.filter((u) => u.isActive)
  const logs: Omit<AuditLog, 'auditId'>[] = []

  for (let day = AUDIT_RETENTION_DAYS + 2; day >= 0; day--) {
    const date = moment().subtract(day, 'days')
    const weekend = date.day() === 0 || date.day() === 6
    const count = Math.floor((weekend ? 2 : 7) + rand() * (weekend ? 3 : 9))
    for (let n = 0; n < count; n++) {
      const at = date.clone().startOf('day').add(7 + rand() * 13, 'hours').add(rand() * 60, 'minutes')
      if (at.isAfter(moment())) continue
      const action = pickAction()
      const [category] = action.split('.')
      const user = pick(activeUsers)
      let actor: AuditActor = { type: 'user', id: user.userId, name: user.displayName }
      let outcome: AuditOutcome = 'success'
      let resourceType = category!
      let resourceName = user.userName
      let details = ''

      switch (category) {
        case 'auth':
          resourceType = 'session'
          resourceName = user.userName
          if (action === 'auth.login_failed') {
            outcome = 'failed'
            details = rand() < 0.5 ? 'Wrong password' : 'Turnstile check failed'
          } else if (action === 'auth.login') details = user.hasTotp2fa ? 'Password + authenticator app' : 'Password'
          break
        case 'api_key': {
          const key = pick(keys.filter((k) => k.isActive))
          actor = { type: 'api_key', id: key.apiKeyId, name: key.keyName }
          resourceType = 'vault'
          resourceName = pick(RESOURCES.vault!)
          details = 'Read through the API'
          break
        }
        case 'vault':
          resourceName = pick(RESOURCES.vault!)
          if (rand() < 0.04) {
            outcome = 'denied'
            details = 'Role has no access to this tag'
          }
          break
        case 'server':
          resourceName = pick(RESOURCES.server!)
          details = action === 'server.command' ? pick(['systemctl status nginx', 'df -h', 'journalctl -u app --since today', 'docker ps']) : 'as deploy'
          if (action === 'server.command' && rand() < 0.06) {
            outcome = 'denied'
            details = 'sudo reboot — needs approval'
          }
          break
        case 'workflow':
          actor = rand() < 0.7 ? { type: 'system', id: null, name: 'Workflow scheduler' } : actor
          resourceName = pick(RESOURCES.workflow!)
          if (rand() < 0.05) {
            outcome = 'failed'
            details = 'Step "Check server health" timed out'
          }
          break
        case 'approval':
          resourceName = pick(RESOURCES.approval!)
          break
        case 'user':
          resourceName = pick(users).userName
          details = 'Changed role'
          break
        case 'role':
          resourceName = pick(roles).roleName
          details = 'Changed permissions'
          break
        case 'tag':
          resourceName = pick(RESOURCES.tag!)
          details = 'Changed description'
          break
        case 'audit':
          resourceType = 'audit_log'
          resourceName = 'Last 30 days'
          details = 'CSV download'
          break
      }
      logs.push({ occurredAt: at.toISOString(), actor, action, resourceType, resourceName, ip: actor.type === 'system' ? '—' : pick(IPS), outcome, details })
    }
  }
  logs.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  return logs.map((log, i) => ({ ...log, auditId: i + 1 })).reverse()
}

/** Everything the mock server holds. */
interface MockState {
  organization: Organization
  users: AdminUser[]
  roles: Role[]
  apiKeys: ApiKey[]
  auditLogs: AuditLog[]
  schedules: AuditExportSchedule[]
  nextId: { user: number; role: number; apiKey: number; audit: number; schedule: number }
}

const createState = (): MockState => {
  const roles = seedRoles()
  const users = seedUsers()
  const apiKeys = seedApiKeys()
  const auditLogs = seedAuditLogs(users, apiKeys, roles)
  return {
    organization: seedOrganization(),
    users,
    roles,
    apiKeys,
    auditLogs,
    schedules: seedSchedules(),
    nextId: {
      user: users.length + 1,
      role: roles.length + 1,
      apiKey: apiKeys.length + 1,
      audit: (auditLogs[0]?.auditId ?? 0) + 1,
      schedule: 2,
    },
  }
}

/** The live mock data. Mutated by ../api/*.ts. */
export let db: MockState = createState()

/** Fresh seed data; tests call this so each one starts from the same state. */
export const resetAdminMock = () => {
  db = createState()
}

/** Who the mock treats as the person making changes. */
const currentActor = (): AuditActor => {
  const me = db.users[0]!
  return { type: 'user', id: me.userId, name: me.displayName }
}

/** Adds an entry to the top of the audit log, like the real server will for every admin change. */
export const recordAudit = (action: keyof typeof AUDIT_ACTIONS | string, resourceType: string, resourceName: string, details = '') => {
  db.auditLogs.unshift({
    auditId: db.nextId.audit++,
    occurredAt: new Date().toISOString(),
    actor: currentActor(),
    action,
    resourceType,
    resourceName,
    ip: '203.0.113.24',
    outcome: 'success',
    details,
  })
}

/** Deep copy, so callers can't mutate the mock's state through returned objects. */
export const clone = <T,>(value: T): T => structuredClone(value)

/** Throws the error a real API would return for a missing record. */
export const notFound = (what: string): never => {
  throw new Error(`That ${what} no longer exists. Refresh and try again.`)
}
