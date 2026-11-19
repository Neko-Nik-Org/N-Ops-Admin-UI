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
 * Workflows: flow-based automation (see N-Ops-Main-API/docs/TODO.md, "Workflows (Automation)").
 * A workflow is a graph drawn with React Flow: one trigger node, then building blocks (Alert, If
 * condition, Remote execution, Ansible, AI, API call, Parser) joined by edges. Nodes and edges use
 * React Flow's shape (`id`, `type`, `position`, `data`; `source`/`target`/`sourceHandle`) so the
 * editor can load them as they are.
 */

// ── Shared ───────────────────────────────────────────────

/** What a step's output is parsed into on success ("auto parse"). */
export type ReturnType = 'bool' | 'int' | 'float' | 'json' | 'text'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** A Vault Env key a step may read, e.g. payments-api / STRIPE_SECRET_KEY (production). */
export interface VaultSecretRef {
  projectId: number
  projectName: string
  name: string
  tagId: number
}

/** A header or other name/value pair; values may use `%KEY` placeholders and `{{secret.NAME}}`. */
export interface KeyValue {
  key: string
  value: string
}

/** A server a step can target. */
export interface WorkflowServer {
  serverId: number
  name: string
  host: string
  tagId: number
}

/**
 * Approval for steps that change things (Remote execution, API calls). `bypass` is the admin's
 * standing exception: the step runs without waiting.
 */
export interface ApprovalSetting {
  required: boolean
  bypass: boolean
  /** Who may approve; empty means any admin. */
  approverUserIds: number[]
}

// ── Trigger ──────────────────────────────────────────────

export type TriggerConfig =
  | { kind: 'interval'; everySeconds: number }
  | { kind: 'cron'; expression: string; timezone: string; description: string }
  | {
      kind: 'metric'
      metric: string
      operator: '>' | '>=' | '<' | '<='
      threshold: number
      unit: string
      /** How long the condition must hold before it fires. */
      forSeconds: number
      /** Servers watched; empty means every server with `tagId`. */
      serverIds: number[]
      tagId: number | null
    }
  | { kind: 'manual' }
  | { kind: 'webhook'; path: string }

// ── If condition ─────────────────────────────────────────

export type ConditionOperator =
  // boolean
  | 'isTrue'
  | 'isFalse'
  // comparison
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  // string
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'matches'
  // numeric
  | 'between'
  // date / time
  | 'before'
  | 'after'
  | 'withinLast'
  // presence
  | 'exists'
  | 'notExists'

/** One test on a value read from the JSON input by `path` (e.g. `checks.db.status`). */
export interface ConditionRule {
  kind: 'rule'
  path: string
  operator: ConditionOperator
  value?: string | number | boolean
  /** Upper bound for `between`. */
  valueTo?: string | number
  /** Unit for `withinLast`. */
  unit?: 'seconds' | 'minutes' | 'hours' | 'days'
}

/** Rules joined with AND / OR; `negate` makes it NOT (…). Groups nest. */
export interface ConditionGroup {
  kind: 'group'
  logic: 'and' | 'or'
  negate: boolean
  children: ConditionNode[]
}

/** User-defined logic: a small script that returns true or false. */
export interface ConditionScript {
  kind: 'script'
  language: 'javascript'
  source: string
}

export type ConditionNode = ConditionRule | ConditionGroup | ConditionScript

// ── Steps ────────────────────────────────────────────────

export interface AlertConfig {
  subject: string
  body: string
  /** Optional files attached to the email, e.g. the previous step's output. */
  attachments: string[]
  /** Only addresses verified in the organization can be used. */
  email: { enabled: boolean; recipients: string[] }
  api: { enabled: boolean; method: HttpMethod; url: string; headers: KeyValue[]; body: string }
  /** In-app notifications to people in the organization. */
  app: { enabled: boolean; userIds: number[]; message: string }
}

export interface ConditionConfig {
  condition: ConditionNode
}

export interface RemoteExecConfig {
  serverIds: number[]
  /** Instead of fixed servers: the server named in the input, e.g. `%server`. */
  serverFromInput?: string
  /** May use `%KEY` from the JSON input and `{{secret.NAME}}` from Vault. */
  command: string
  strategy: { kind: 'sequential' } | { kind: 'parallel' } | { kind: 'canary'; batchSize: number; pauseSeconds: number }
  captureOutput: boolean
  returnType: ReturnType
  timeoutSeconds: number
  approval: ApprovalSetting
  secrets: VaultSecretRef[]
}

/** Ansible has no output; only its error handle can be connected. */
export interface AnsibleConfig {
  playbook: string
  serverIds: number[]
  extraVars: KeyValue[]
  options: { check: boolean; become: boolean; tags: string[]; forks: number }
  secrets: VaultSecretRef[]
}

/** AI steps can't read Vault secrets; their output is always a string. */
export interface AiConfig {
  model: string
  prompt: string
  /** Which input to send, e.g. `%output` of the previous step. */
  input: string
  maxTokens: number
}

export interface ApiCallConfig {
  method: HttpMethod
  url: string
  headers: KeyValue[]
  body: string
  returnType: ReturnType
  timeoutSeconds: number
  approval: ApprovalSetting
  secrets: VaultSecretRef[]
}

export type ParserOperation =
  | { kind: 'toJson'; lenient: boolean }
  | { kind: 'toInt' }
  | { kind: 'toFloat' }
  | { kind: 'toBool' }
  | { kind: 'extract'; fields: Array<{ name: string; path: string }> }
  | { kind: 'regex'; pattern: string; group: number }

/** Always outputs `{ ok, value, error }`, so the next step can rely on the shape. */
export interface ParserConfig {
  inputFormat: 'text' | 'json'
  trim: boolean
  operation: ParserOperation
  onError: { kind: 'fail' } | { kind: 'default'; value: string }
}

// ── Graph ────────────────────────────────────────────────

/** Config per node type. */
export interface NodeConfigs {
  trigger: TriggerConfig
  alert: AlertConfig
  condition: ConditionConfig
  remoteExec: RemoteExecConfig
  ansible: AnsibleConfig
  ai: AiConfig
  apiCall: ApiCallConfig
  parser: ParserConfig
}

export type WorkflowNodeType = keyof NodeConfigs

/** A React Flow node: `type` picks the custom node component, `data` holds its settings. */
export type WorkflowNode = {
  [T in WorkflowNodeType]: {
    id: string
    type: T
    position: { x: number; y: number }
    data: { label: string; config: NodeConfigs[T] }
  }
}[WorkflowNodeType]

/**
 * Which outgoing handle an edge leaves from: `out` on success, `error` on failure, `true` /
 * `false` for an If condition.
 */
export type EdgeHandle = 'out' | 'error' | 'true' | 'false'

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle: EdgeHandle
}

export interface Workflow {
  workflowId: number
  name: string
  description: string
  enabled: boolean
  tagId: number
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  /** When a schedule trigger fires next; null for manual, webhook and metric triggers. */
  nextRunAt: string | null
}

/** A row in the workflows list. */
export interface WorkflowSummary {
  workflowId: number
  name: string
  description: string
  enabled: boolean
  tagId: number
  trigger: TriggerConfig
  stepCount: number
  updatedAt: string
  updatedBy: string
  nextRunAt: string | null
  lastRun: Pick<WorkflowRun, 'runId' | 'status' | 'startedAt'> | null
}

/** Fields set when creating or saving a workflow. */
export type WorkflowInput = Pick<Workflow, 'name' | 'description' | 'enabled' | 'tagId' | 'nodes' | 'edges'>

// ── Runs ─────────────────────────────────────────────────

export type RunStatus = 'running' | 'waiting_approval' | 'success' | 'failed' | 'rejected' | 'cancelled'

export type StepStatus = 'success' | 'failed' | 'skipped' | 'running' | 'waiting_approval'

export interface RunStep {
  nodeId: string
  label: string
  status: StepStatus
  startedAt: string | null
  durationMs: number | null
  /** The parsed output passed to the next step, as text. */
  output: string | null
  error: string | null
}

export interface WorkflowRun {
  runId: number
  workflowId: number
  status: RunStatus
  /** What started it, e.g. "Schedule (every 10s)", "Manual by Neko Nik". */
  triggeredBy: string
  startedAt: string
  finishedAt: string | null
  steps: RunStep[]
  /** Set while waiting: the step that needs approval. */
  approval: { nodeId: string; requestedAt: string; decidedBy: string | null } | null
}
