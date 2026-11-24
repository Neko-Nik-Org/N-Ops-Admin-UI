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
/** How workflow pieces are named, drawn and described in the UI. */

import { Bell, Braces, Globe, ScrollText, Sparkles, Split, SquareTerminal, Zap, type LucideIcon } from 'lucide-react'
import type { BadgeTone } from '@/components/Badge'
import type {
  ConditionNode,
  ConditionOperator,
  RunStatus,
  StepStatus,
  TriggerConfig,
  WorkflowNode,
  WorkflowNodeType,
} from '@/types/workflow'

export interface NodeTypeInfo {
  label: string
  icon: LucideIcon
  /** Tailwind text color class for the icon. */
  color: string
}

export const NODE_TYPES: Readonly<Record<WorkflowNodeType, NodeTypeInfo>> = {
  trigger: { label: 'Trigger', icon: Zap, color: 'text-signal' },
  alert: { label: 'Alert', icon: Bell, color: 'text-danger' },
  condition: { label: 'If condition', icon: Split, color: 'text-warning' },
  remoteExec: { label: 'Remote execution', icon: SquareTerminal, color: 'text-accent-secondary' },
  ansible: { label: 'Ansible playbook', icon: ScrollText, color: 'text-accent-secondary' },
  ai: { label: 'AI', icon: Sparkles, color: 'text-signal' },
  apiCall: { label: 'API call', icon: Globe, color: 'text-accent-secondary' },
  parser: { label: 'Parser', icon: Braces, color: 'text-text-muted' },
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

/** "every 10 seconds", "every 5 minutes", "every 2 hours". */
export const describeInterval = (seconds: number) => {
  if (seconds % 3600 === 0) return `Every ${plural(seconds / 3600, 'hour')}`
  if (seconds % 60 === 0) return `Every ${plural(seconds / 60, 'minute')}`
  return `Every ${plural(seconds, 'second')}`
}

/** A trigger in a few words, e.g. "Every 1 minute", "cpu.usage > 90% for 5 minutes". */
export const describeTrigger = (t: TriggerConfig): string => {
  switch (t.kind) {
    case 'interval':
      return describeInterval(t.everySeconds)
    case 'cron':
      return t.description || t.expression
    case 'metric':
      return `${t.metric} ${t.operator} ${t.threshold}${t.unit} for ${describeInterval(t.forSeconds).replace('Every ', '')}`
    case 'manual':
      return 'Run manually'
    case 'webhook':
      return `Webhook ${t.path}`
  }
}

export const TRIGGER_KINDS: Record<TriggerConfig['kind'], string> = {
  interval: 'Interval',
  cron: 'Schedule',
  metric: 'Metric',
  manual: 'Manual',
  webhook: 'Webhook',
}

const OPS: Record<ConditionOperator, string> = {
  isTrue: 'is true',
  isFalse: 'is false',
  eq: '==',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  matches: 'matches',
  between: 'between',
  before: 'before',
  after: 'after',
  withinLast: 'within last',
  exists: 'exists',
  notExists: 'does not exist',
}

const show = (v: unknown) => (typeof v === 'string' ? `"${v}"` : String(v))

/** A condition as one line, e.g. `status != "ok" OR checks.db.latency_ms > 500`. */
export const describeCondition = (c: ConditionNode): string => {
  if (c.kind === 'script') return `script (${c.language})`
  if (c.kind === 'group') {
    const inner = c.children.map((child) => (child.kind === 'group' ? `(${describeCondition(child)})` : describeCondition(child)))
    const joined = inner.join(` ${c.logic.toUpperCase()} `)
    return c.negate ? `NOT (${joined})` : joined
  }
  const parts = [c.path, OPS[c.operator]]
  if (c.operator === 'between') parts.push(`${show(c.value)} and ${show(c.valueTo)}`)
  else if (c.operator === 'withinLast') parts.push(`${c.value} ${c.unit ?? ''}`.trim())
  else if (c.value !== undefined) parts.push(show(c.value))
  return parts.join(' ')
}

export const RUN_STATUS: Record<RunStatus, { label: string; tone: BadgeTone }> = {
  running: { label: 'Running', tone: 'accent' },
  waiting_approval: { label: 'Waiting for approval', tone: 'warning' },
  success: { label: 'Succeeded', tone: 'signal' },
  failed: { label: 'Failed', tone: 'danger' },
  rejected: { label: 'Rejected', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const STEP_STATUS: Record<StepStatus, { label: string; tone: BadgeTone }> = {
  success: { label: 'Succeeded', tone: 'signal' },
  failed: { label: 'Failed', tone: 'danger' },
  skipped: { label: 'Skipped', tone: 'neutral' },
  running: { label: 'Running', tone: 'accent' },
  waiting_approval: { label: 'Waiting for approval', tone: 'warning' },
}

/** One line under the step's name: what it does. */
export const nodeSummary = (n: WorkflowNode): string => {
  switch (n.type) {
    case 'trigger':
      return describeTrigger(n.data.config)
    case 'alert': {
      const c = n.data.config
      return [c.email.enabled && 'Email', c.api.enabled && 'API', c.app.enabled && 'App'].filter(Boolean).join(' · ')
    }
    case 'condition':
      return describeCondition(n.data.config.condition)
    case 'remoteExec':
      return n.data.config.command
    case 'ansible':
      return n.data.config.playbook
    case 'ai':
      return n.data.config.model
    case 'apiCall':
      return `${n.data.config.method} ${n.data.config.url}`
    case 'parser': {
      const op = n.data.config.operation
      return op.kind === 'extract' ? `extract ${op.fields.map((f) => f.name).join(', ')}` : op.kind
    }
  }
}
