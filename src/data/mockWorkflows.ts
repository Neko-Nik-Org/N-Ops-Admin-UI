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
 * In-memory mock of the Workflows API. The API has no workflow endpoints yet, so
 * `api/workflows.ts` calls this. It shares the Admin mock's users and audit log, keeps
 * changes until reload, and matches the org's usage (6 workflows, limit 20).
 *
 * Seeds, built from the examples in N-Ops-Main-API/docs/TODO.md:
 * 1. Server health check: every 10s → check health → alert if unhealthy
 * 2. Mail queue watch: every 1m → read queue → parse to int → over threshold → alert
 * 3. High CPU investigation: CPU metric → parse → inspect server → AI summary → alert
 * 4. Weekly audit export: Mondays 06:00 → export API → email (the Audit page's schedule)
 * 5. Nginx config rollout: manual → Ansible (canary, needs approval) → alert on error
 * 6. TLS certificate expiry: daily → status API → parse → expiring soon → alert (disabled draft)
 *
 * Tag ids: 1 production, 2 staging, 3 development, 4 internal. User ids follow the Admin mock
 * (1 Neko Nik, 2 Priya Rao, 3 Marcus Chen, 4 Aisha Bello, 6 Lena Fischer).
 */

import moment from 'moment'
import type {
  AlertConfig,
  ApprovalSetting,
  RunStep,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowRun,
  WorkflowServer,
} from '@/types/workflow'

const ago = (amount: number, unit: moment.unitOfTime.DurationConstructor) => moment().subtract(amount, unit).toISOString()

/** Servers the workflows target (the Servers section has no API or mock yet). */
export const WORKFLOW_SERVERS: readonly WorkflowServer[] = [
  { serverId: 1, name: 'web-01', host: '10.0.1.11', tagId: 1 },
  { serverId: 2, name: 'web-02', host: '10.0.1.12', tagId: 1 },
  { serverId: 3, name: 'web-03', host: '10.0.1.13', tagId: 1 },
  { serverId: 4, name: 'api-01', host: '10.0.2.21', tagId: 1 },
  { serverId: 5, name: 'mail-01', host: '10.0.3.31', tagId: 1 },
  { serverId: 6, name: 'db-01', host: '10.0.4.12', tagId: 1 },
  { serverId: 7, name: 'web-staging-01', host: '10.1.1.11', tagId: 2 },
  { serverId: 8, name: 'monitor-01', host: '10.0.8.31', tagId: 4 },
]

/** Email addresses verified for alerts; alerts can only send to these. */
export const VERIFIED_RECIPIENTS: readonly string[] = [
  'ops@acme.dev',
  'oncall@acme.dev',
  'security@acme.dev',
  'neko@acme.dev',
  'priya@acme.dev',
]

// ── Node builders ────────────────────────────────────────

type NodeOf<T extends WorkflowNode['type']> = Extract<WorkflowNode, { type: T }>

const node = <T extends WorkflowNode['type']>(
  id: string,
  type: T,
  label: string,
  [x, y]: [number, number],
  config: NodeOf<T>['data']['config'],
) => ({ id, type, position: { x, y }, data: { label, config } }) as NodeOf<T>

const edge = (source: string, target: string, sourceHandle: WorkflowEdge['sourceHandle'] = 'out'): WorkflowEdge => ({
  id: `${source}-${sourceHandle}-${target}`,
  source,
  target,
  sourceHandle,
})

const noApproval: ApprovalSetting = { required: false, bypass: false, approverUserIds: [] }

/** An alert with only the channels given filled in. */
const alert = (subject: string, body: string, channels: Partial<Omit<AlertConfig, 'subject' | 'body'>>): AlertConfig => ({
  subject,
  body,
  attachments: [],
  email: { enabled: false, recipients: [] },
  api: { enabled: false, method: 'POST', url: '', headers: [], body: '' },
  app: { enabled: false, userIds: [], message: '' },
  ...channels,
})

const COL = 280 // React Flow x spacing between steps

// ── Workflows ────────────────────────────────────────────

const base = (
  workflowId: number,
  name: string,
  description: string,
  tagId: number,
  createdDaysAgo: number,
  updatedHoursAgo: number,
  by: string,
): Omit<Workflow, 'nodes' | 'edges' | 'enabled' | 'nextRunAt'> => ({
  workflowId,
  name,
  description,
  tagId,
  createdAt: ago(createdDaysAgo, 'days'),
  createdBy: by,
  updatedAt: ago(updatedHoursAgo, 'hours'),
  updatedBy: by,
})

const serverHealthCheck = (): Workflow => ({
  ...base(
    1,
    'Server health check',
    'Checks the web servers every 10 seconds and alerts on-call when one is unhealthy.',
    1,
    120,
    30,
    'Priya Rao',
  ),
  enabled: true,
  nextRunAt: moment().add(10, 'seconds').toISOString(),
  nodes: [
    node('trigger', 'trigger', 'Every 10 seconds', [0, 0], { kind: 'interval', everySeconds: 10 }),
    node('health', 'remoteExec', 'Check /healthz', [COL, 0], {
      serverIds: [1, 2, 3],
      command: 'curl -fsS --max-time 3 http://localhost:8080/healthz',
      strategy: { kind: 'parallel' },
      captureOutput: true,
      returnType: 'json',
      timeoutSeconds: 5,
      approval: noApproval,
      secrets: [],
    }),
    node('unhealthy', 'condition', 'Unhealthy?', [COL * 2, 0], {
      condition: {
        kind: 'group',
        logic: 'or',
        negate: false,
        children: [
          { kind: 'rule', path: 'status', operator: 'ne', value: 'ok' },
          { kind: 'rule', path: 'checks.db.latency_ms', operator: 'gt', value: 500 },
        ],
      },
    }),
    node(
      'notify',
      'alert',
      'Page on-call',
      [COL * 3, 0],
      alert(
        '[%server] health check failing',
        'Health check on %server returned:\n\n%output\n\nRunbook: Vault › web › Notes › On-call runbook',
        {
          email: { enabled: true, recipients: ['oncall@acme.dev'] },
          app: { enabled: true, userIds: [1, 2], message: '%server is unhealthy: %status' },
        },
      ),
    ),
    node(
      'unreachable',
      'alert',
      'Server unreachable',
      [COL * 2, 180],
      alert('[%server] unreachable', 'Could not reach %server to run the health check.\n\nError: %error', {
        email: { enabled: true, recipients: ['oncall@acme.dev'] },
      }),
    ),
  ],
  edges: [
    edge('trigger', 'health'),
    edge('health', 'unhealthy'),
    edge('health', 'unreachable', 'error'),
    edge('unhealthy', 'notify', 'true'),
  ],
})

const mailQueueWatch = (): Workflow => ({
  ...base(
    2,
    'Mail queue watch',
    'Alerts when the outgoing mail queue on mail-01 grows past 500 messages.',
    1,
    90,
    72,
    'Marcus Chen',
  ),
  enabled: true,
  nextRunAt: moment().add(1, 'minute').startOf('minute').toISOString(),
  nodes: [
    node('trigger', 'trigger', 'Every 1 minute', [0, 0], { kind: 'interval', everySeconds: 60 }),
    node('queue', 'remoteExec', 'Read mail queue', [COL, 0], {
      serverIds: [5],
      command: "postqueue -p | tail -n 1 | awk '{print $5}'",
      strategy: { kind: 'sequential' },
      captureOutput: true,
      returnType: 'text',
      timeoutSeconds: 10,
      approval: noApproval,
      secrets: [],
    }),
    node('count', 'parser', 'To number', [COL * 2, 0], {
      inputFormat: 'text',
      trim: true,
      operation: { kind: 'toInt' },
      onError: { kind: 'default', value: '0' },
    }),
    node('over', 'condition', 'Over 500?', [COL * 3, 0], {
      condition: { kind: 'rule', path: 'value', operator: 'gt', value: 500 },
    }),
    node(
      'notify',
      'alert',
      'Mail queue alert',
      [COL * 4, 0],
      alert('Mail queue at %value messages', 'The outgoing mail queue on mail-01 has %value messages (threshold 500).', {
        email: { enabled: true, recipients: ['ops@acme.dev'] },
        api: {
          enabled: true,
          method: 'POST',
          url: 'https://hooks.slack.com/services/{{secret.SLACK_OPS_WEBHOOK}}',
          headers: [{ key: 'Content-Type', value: 'application/json' }],
          body: '{"text": "Mail queue on mail-01: %value messages"}',
        },
      }),
    ),
  ],
  edges: [edge('trigger', 'queue'), edge('queue', 'count'), edge('count', 'over'), edge('over', 'notify', 'true')],
})

const highCpuInvestigation = (): Workflow => ({
  ...base(
    3,
    'High CPU investigation',
    'When a production server stays above 90% CPU for 5 minutes, collects the top processes, asks AI for a summary and alerts with the details.',
    1,
    45,
    5,
    'Neko Nik',
  ),
  enabled: true,
  nextRunAt: null,
  nodes: [
    node('trigger', 'trigger', 'CPU > 90% for 5m', [0, 0], {
      kind: 'metric',
      metric: 'cpu.usage',
      operator: '>',
      threshold: 90,
      unit: '%',
      forSeconds: 300,
      serverIds: [],
      tagId: 1,
    }),
    node('fields', 'parser', 'Pick host and value', [COL, 0], {
      inputFormat: 'json',
      trim: false,
      operation: {
        kind: 'extract',
        fields: [
          { name: 'host', path: 'server.host' },
          { name: 'server', path: 'server.name' },
          { name: 'cpu', path: 'value' },
        ],
      },
      onError: { kind: 'fail' },
    }),
    node('top', 'remoteExec', 'Top processes', [COL * 2, 0], {
      serverIds: [],
      serverFromInput: '%server',
      command: 'ps aux --sort=-%cpu | head -n 6 && uptime',
      strategy: { kind: 'sequential' },
      captureOutput: true,
      returnType: 'text',
      timeoutSeconds: 15,
      approval: noApproval,
      secrets: [],
    }),
    node('summary', 'ai', 'Summarise', [COL * 3, 0], {
      model: 'claude-haiku-5-5',
      prompt:
        'You are helping an on-call engineer. In 3 short bullet points, say which process is using the CPU, whether it looks like a runaway, and what to check first.',
      input: '%output',
      maxTokens: 300,
    }),
    node(
      'notify',
      'alert',
      'CPU alert with summary',
      [COL * 4, 0],
      alert(
        '[%server] CPU at %cpu%',
        'CPU on %server has been above 90% for 5 minutes.\n\nSummary:\n%summary\n\nTop processes:\n%top',
        {
          email: { enabled: true, recipients: ['oncall@acme.dev'] },
          app: { enabled: true, userIds: [1, 3], message: '%server CPU at %cpu%' },
        },
      ),
    ),
  ],
  edges: [edge('trigger', 'fields'), edge('fields', 'top'), edge('top', 'summary'), edge('summary', 'notify')],
})

const weeklyAuditExport = (): Workflow => ({
  ...base(
    4,
    'Weekly audit export',
    'Exports last week’s audit log as CSV and emails it to security every Monday.',
    4,
    60,
    24 * 20,
    'Neko Nik',
  ),
  enabled: true,
  nextRunAt: moment().add(1, 'week').startOf('isoWeek').add(6, 'hours').toISOString(),
  nodes: [
    node('trigger', 'trigger', 'Mondays 06:00', [0, 0], {
      kind: 'cron',
      expression: '0 6 * * 1',
      timezone: 'Asia/Kolkata',
      description: 'Every Monday at 06:00',
    }),
    node('export', 'apiCall', 'Export audit log', [COL, 0], {
      method: 'POST',
      url: 'https://api.nops.app/audit/export',
      headers: [{ key: 'Authorization', value: 'Bearer {{secret.NOPS_AUDIT_TOKEN}}' }],
      body: '{"from": "%week_start", "to": "%week_end", "format": "csv"}',
      returnType: 'json',
      timeoutSeconds: 60,
      approval: noApproval,
      secrets: [{ projectId: 4, projectName: 'internal-tools', name: 'NOPS_AUDIT_TOKEN', tagId: 4 }],
    }),
    node('email', 'alert', 'Email to security', [COL * 2, 0], {
      ...alert('Audit log %week_start – %week_end', 'Attached is the audit log for last week (%rows entries).', {
        email: { enabled: true, recipients: ['security@acme.dev'] },
      }),
      attachments: ['%file_url'],
    }),
    node(
      'failed',
      'alert',
      'Export failed',
      [COL, 180],
      alert('Weekly audit export failed', 'The audit export failed: %error', {
        app: { enabled: true, userIds: [1], message: 'Audit export failed' },
      }),
    ),
  ],
  edges: [edge('trigger', 'export'), edge('export', 'email'), edge('export', 'failed', 'error')],
})

const nginxRollout = (): Workflow => ({
  ...base(
    5,
    'Nginx config rollout',
    'Rolls the nginx config out to the web servers one at a time. Needs an admin’s approval; alerts if a host fails.',
    1,
    30,
    48,
    'Lena Fischer',
  ),
  enabled: true,
  nextRunAt: null,
  nodes: [
    node('trigger', 'trigger', 'Run manually', [0, 0], { kind: 'manual' }),
    node('preflight', 'remoteExec', 'nginx -t', [COL, 0], {
      serverIds: [1, 2, 3],
      command: 'sudo nginx -t',
      strategy: { kind: 'canary', batchSize: 1, pauseSeconds: 30 },
      captureOutput: true,
      returnType: 'bool',
      timeoutSeconds: 30,
      approval: { required: true, bypass: false, approverUserIds: [1, 2] },
      secrets: [],
    }),
    node('deploy', 'ansible', 'deploy-nginx.yml', [COL * 2, 0], {
      playbook: 'playbooks/deploy-nginx.yml',
      serverIds: [1, 2, 3],
      extraVars: [
        { key: 'nginx_conf_version', value: '%version' },
        { key: 'reload_only', value: 'true' },
      ],
      options: { check: false, become: true, tags: ['nginx'], forks: 1 },
      secrets: [{ projectId: 2, projectName: 'web', name: 'TLS_KEY_PASSPHRASE', tagId: 1 }],
    }),
    node(
      'failed',
      'alert',
      'Rollout failed',
      [COL * 2, 180],
      alert('Nginx rollout failed on %server', 'Ansible stopped on %server:\n\n%error', {
        email: { enabled: true, recipients: ['ops@acme.dev'] },
        app: { enabled: true, userIds: [6], message: 'Nginx rollout failed on %server' },
      }),
    ),
  ],
  edges: [
    edge('trigger', 'preflight'),
    edge('preflight', 'deploy'),
    edge('deploy', 'failed', 'error'),
    edge('preflight', 'failed', 'error'),
  ],
})

const certExpiry = (): Workflow => ({
  ...base(
    6,
    'TLS certificate expiry',
    'Daily check for certificates expiring within 14 days. Draft: not enabled yet.',
    1,
    4,
    4 * 24,
    'Aisha Bello',
  ),
  enabled: false,
  nextRunAt: null,
  nodes: [
    node('trigger', 'trigger', 'Daily 09:00', [0, 0], {
      kind: 'cron',
      expression: '0 9 * * *',
      timezone: 'Asia/Kolkata',
      description: 'Every day at 09:00',
    }),
    node('certs', 'apiCall', 'Fetch certificates', [COL, 0], {
      method: 'GET',
      url: 'https://status.acme.dev/api/certificates',
      headers: [{ key: 'Authorization', value: 'Bearer {{secret.STATUS_API_TOKEN}}' }],
      body: '',
      returnType: 'text',
      timeoutSeconds: 20,
      approval: noApproval,
      secrets: [{ projectId: 4, projectName: 'internal-tools', name: 'STATUS_API_TOKEN', tagId: 4 }],
    }),
    node('json', 'parser', 'Parse response', [COL * 2, 0], {
      inputFormat: 'text',
      trim: true,
      operation: { kind: 'toJson', lenient: true },
      onError: { kind: 'fail' },
    }),
    node('expiring', 'condition', 'Expiring soon?', [COL * 3, 0], {
      condition: {
        kind: 'group',
        logic: 'and',
        negate: false,
        children: [
          { kind: 'rule', path: 'soonest.not_after', operator: 'exists' },
          { kind: 'rule', path: 'soonest.days_left', operator: 'between', value: 0, valueTo: 14 },
          {
            kind: 'group',
            logic: 'or',
            negate: true,
            children: [{ kind: 'rule', path: 'soonest.domain', operator: 'endsWith', value: '.internal' }],
          },
        ],
      },
    }),
    node(
      'notify',
      'alert',
      'Renew reminder',
      [COL * 4, 0],
      alert(
        '%soonest.domain expires in %soonest.days_left days',
        'The certificate for %soonest.domain expires on %soonest.not_after.',
        {
          email: { enabled: true, recipients: ['ops@acme.dev', 'security@acme.dev'] },
        },
      ),
    ),
  ],
  edges: [edge('trigger', 'certs'), edge('certs', 'json'), edge('json', 'expiring'), edge('expiring', 'notify', 'true')],
})

// ── Runs ─────────────────────────────────────────────────

/** One finished step, `secondsAgo` before now, taking `ms`. */
const step = (
  w: Workflow,
  nodeId: string,
  status: RunStep['status'],
  secondsAgo: number,
  ms: number | null,
  output: string | null = null,
  error: string | null = null,
): RunStep => ({
  nodeId,
  label: w.nodes.find((n) => n.id === nodeId)?.data.label ?? nodeId,
  status,
  startedAt: status === 'skipped' || status === 'waiting_approval' ? null : ago(secondsAgo, 'seconds'),
  durationMs: ms,
  output,
  error,
})

const run = (
  runId: number,
  w: Workflow,
  status: WorkflowRun['status'],
  triggeredBy: string,
  secondsAgo: number,
  totalSeconds: number | null,
  steps: RunStep[],
  approval: WorkflowRun['approval'] = null,
): WorkflowRun => ({
  runId,
  workflowId: w.workflowId,
  status,
  triggeredBy,
  startedAt: ago(secondsAgo, 'seconds'),
  finishedAt: totalSeconds === null ? null : ago(secondsAgo - totalSeconds, 'seconds'),
  steps,
  approval,
})

const seedRuns = (ws: Workflow[]): WorkflowRun[] => {
  const [health, mail, cpu, audit, nginx] = ws as [Workflow, Workflow, Workflow, Workflow, Workflow]
  const healthy = '{"status":"ok","checks":{"db":{"status":"ok","latency_ms":12}}}'
  return [
    run(1, health, 'success', 'Schedule (every 10s)', 8, 1, [
      step(health, 'health', 'success', 8, 640, healthy),
      step(health, 'unhealthy', 'success', 7, 2, 'false'),
      step(health, 'notify', 'skipped', 0, null),
    ]),
    run(2, health, 'success', 'Schedule (every 10s)', 3_600, 3, [
      step(health, 'health', 'success', 3_600, 2_710, '{"status":"degraded","checks":{"db":{"status":"slow","latency_ms":812}}}'),
      step(health, 'unhealthy', 'success', 3_597, 3, 'true'),
      step(health, 'notify', 'success', 3_597, 420, 'Email sent to oncall@acme.dev; 2 app notifications'),
    ]),
    run(3, health, 'failed', 'Schedule (every 10s)', 86_400, 5, [
      step(health, 'health', 'failed', 86_400, 5_000, null, 'web-03: connection timed out after 5s'),
      step(health, 'unreachable', 'success', 86_395, 380, 'Email sent to oncall@acme.dev'),
    ]),
    run(4, mail, 'success', 'Schedule (every 1m)', 42, 1, [
      step(mail, 'queue', 'success', 42, 310, ' 37 '),
      step(mail, 'count', 'success', 41, 1, '{"ok":true,"value":37,"error":null}'),
      step(mail, 'over', 'success', 41, 1, 'false'),
      step(mail, 'notify', 'skipped', 0, null),
    ]),
    run(5, mail, 'success', 'Schedule (every 1m)', 7_200, 2, [
      step(mail, 'queue', 'success', 7_200, 290, ' 812 '),
      step(mail, 'count', 'success', 7_199, 1, '{"ok":true,"value":812,"error":null}'),
      step(mail, 'over', 'success', 7_199, 1, 'true'),
      step(mail, 'notify', 'success', 7_199, 610, 'Email sent to ops@acme.dev; webhook 200 OK'),
    ]),
    run(6, cpu, 'success', 'Metric: cpu.usage 94% on api-01', 18_000, 9, [
      step(cpu, 'fields', 'success', 18_000, 1, '{"host":"10.0.2.21","server":"api-01","cpu":94}'),
      step(
        cpu,
        'top',
        'success',
        17_999,
        1_200,
        'USER  PID %CPU COMMAND\napp  4121 88.2 node dist/worker.js\napp  4122  3.1 node dist/server.js\n load average: 3.92, 3.71, 2.10',
      ),
      step(
        cpu,
        'summary',
        'success',
        17_998,
        6_400,
        '- node dist/worker.js (PID 4121) is using 88% CPU.\n- It has been high for 5+ minutes: likely a stuck job loop.\n- Check the worker queue for a retrying job, then restart the worker.',
      ),
      step(cpu, 'notify', 'success', 17_991, 500, 'Email sent to oncall@acme.dev; 2 app notifications'),
    ]),
    run(7, audit, 'success', 'Schedule (Mondays 06:00)', 3 * 86_400, 14, [
      step(
        audit,
        'export',
        'success',
        3 * 86_400,
        12_800,
        '{"rows":1284,"file_url":"https://files.nops.app/audit/2026-W46.csv"}',
      ),
      step(audit, 'email', 'success', 3 * 86_400 - 13, 900, 'Email sent to security@acme.dev with 1 attachment'),
    ]),
    run(8, nginx, 'failed', 'Manual by Lena Fischer', 2 * 86_400, 95, [
      step(nginx, 'preflight', 'success', 2 * 86_400, 2_100, 'true'),
      step(
        nginx,
        'deploy',
        'failed',
        2 * 86_400 - 3,
        91_000,
        null,
        'web-02: TASK [nginx : reload] fatal: nginx.service failed to reload',
      ),
      step(nginx, 'failed', 'success', 2 * 86_400 - 94, 450, 'Email sent to ops@acme.dev; 1 app notification'),
    ]),
    run(
      9,
      nginx,
      'waiting_approval',
      'Manual by Lena Fischer',
      600,
      null,
      [step(nginx, 'preflight', 'waiting_approval', 600, null), step(nginx, 'deploy', 'skipped', 0, null)],
      { nodeId: 'preflight', requestedAt: ago(600, 'seconds'), decidedBy: null },
    ),
  ]
}

// ── State ────────────────────────────────────────────────

interface WorkflowState {
  workflows: Workflow[]
  runs: WorkflowRun[]
  nextId: { workflow: number; run: number }
}

const createState = (): WorkflowState => {
  const workflows = [
    serverHealthCheck(),
    mailQueueWatch(),
    highCpuInvestigation(),
    weeklyAuditExport(),
    nginxRollout(),
    certExpiry(),
  ]
  const runs = seedRuns(workflows)
  return { workflows, runs, nextId: { workflow: workflows.length + 1, run: runs.length + 1 } }
}

/** The live workflow mock. Mutated by api/workflows.ts. */
export let workflowDb: WorkflowState = createState()

/** Fresh seed data; tests call this so each one starts from the same state. */
export const resetWorkflowMock = () => {
  workflowDb = createState()
}
