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
/** The settings of the step picked on the canvas, read-only. */

import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { useAdminUsers } from '@/hooks/useUsers'
import { useTagOptions } from '@/hooks/useTagOptions'
import { describeCondition, describeInterval, describeTrigger, NODE_TYPES, STEP_STATUS } from '@/utils/describeWorkflow'
import { useWorkflowServers } from '@/hooks/useWorkflows'
import type { ApprovalSetting, KeyValue, RunStep, VaultSecretRef, WorkflowNode } from '@/types/workflow'

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <dt className="text-text-muted">{label}</dt>
    <dd className="min-w-0 break-words text-text">{children}</dd>
  </>
)

const Code = ({ children }: { children: ReactNode }) => (
  <pre className="max-h-48 overflow-auto rounded-md border border-border bg-ink/40 p-2 font-mono text-xs whitespace-pre-wrap text-text">
    {children}
  </pre>
)

const pairs = (kv: KeyValue[]) => (kv.length ? kv.map((h) => `${h.key}: ${h.value}`).join('\n') : null)

export const StepDetails = ({ step, runStep }: { step: WorkflowNode; runStep?: RunStep }) => {
  const { data: servers } = useWorkflowServers()
  const { data: users } = useAdminUsers()
  const { tagName } = useTagOptions()
  const serverNames = (ids: number[]) => ids.map((id) => servers?.find((s) => s.serverId === id)?.name ?? `#${id}`).join(', ')
  const userNames = (ids: number[]) =>
    ids.map((id) => users?.find((u) => u.userId === id)?.displayName ?? `user #${id}`).join(', ')
  const secrets = (refs: VaultSecretRef[]) =>
    refs.length ? (
      <ul className="flex flex-col gap-1">
        {refs.map((r) => (
          <li key={`${r.projectId}-${r.name}-${r.tagId}`} className="font-mono text-xs">
            {r.projectName} / {r.name} <span className="text-text-muted">({tagName(r.tagId)})</span>
          </li>
        ))}
      </ul>
    ) : (
      'None'
    )
  const approval = (a: ApprovalSetting) =>
    !a.required
      ? 'Not needed'
      : a.bypass
        ? 'Bypassed by an admin exception'
        : `Needed${a.approverUserIds.length ? ` from ${userNames(a.approverUserIds)}` : ''}`

  const info = NODE_TYPES[step.type]
  const Icon = info.icon
  let rows: ReactNode
  switch (step.type) {
    case 'trigger': {
      const t = step.data.config
      rows = (
        <>
          <Row label="When">{describeTrigger(t)}</Row>
          {t.kind === 'cron' && (
            <Row label="Cron">
              <code className="font-mono text-xs">{t.expression}</code> ({t.timezone})
            </Row>
          )}
          {t.kind === 'metric' && (
            <Row label="Watches">
              {t.serverIds.length ? serverNames(t.serverIds) : `Every server tagged ${tagName(t.tagId ?? 0)}`}
            </Row>
          )}
          {t.kind === 'metric' && <Row label="Holds for">{describeInterval(t.forSeconds).replace('Every ', '')}</Row>}
        </>
      )
      break
    }
    case 'alert': {
      const c = step.data.config
      rows = (
        <>
          <Row label="Subject">{c.subject}</Row>
          <Row label="Body">
            <Code>{c.body}</Code>
          </Row>
          {c.attachments.length > 0 && <Row label="Attachments">{c.attachments.join(', ')}</Row>}
          {c.email.enabled && <Row label="Email">{c.email.recipients.join(', ')}</Row>}
          {c.api.enabled && (
            <Row label="API">
              <span className="font-mono text-xs">
                {c.api.method} {c.api.url}
              </span>
            </Row>
          )}
          {c.app.enabled && <Row label="App">{userNames(c.app.userIds)}</Row>}
          <Row label="Next step">None: an alert is always the last step</Row>
        </>
      )
      break
    }
    case 'condition':
      rows = (
        <>
          <Row label="Condition">
            <Code>{describeCondition(step.data.config.condition)}</Code>
          </Row>
          <Row label="Outputs">
            <Badge tone="signal">true</Badge> <Badge>false</Badge>
          </Row>
        </>
      )
      break
    case 'remoteExec': {
      const c = step.data.config
      rows = (
        <>
          <Row label="Servers">{c.serverFromInput ? `From input (${c.serverFromInput})` : serverNames(c.serverIds)}</Row>
          <Row label="Command">
            <Code>{c.command}</Code>
          </Row>
          <Row label="Strategy">
            {c.strategy.kind === 'canary'
              ? `Canary: ${c.strategy.batchSize} at a time, ${c.strategy.pauseSeconds}s pause`
              : c.strategy.kind === 'parallel'
                ? 'All at once'
                : 'One after another'}
          </Row>
          <Row label="Output">{c.captureOutput ? `Captured as ${c.returnType}` : 'Not captured'}</Row>
          <Row label="Timeout">{c.timeoutSeconds}s</Row>
          <Row label="Approval">{approval(c.approval)}</Row>
          <Row label="Vault secrets">{secrets(c.secrets)}</Row>
        </>
      )
      break
    }
    case 'ansible': {
      const c = step.data.config
      rows = (
        <>
          <Row label="Playbook">
            <span className="font-mono text-xs">{c.playbook}</span>
          </Row>
          <Row label="Servers">{serverNames(c.serverIds)}</Row>
          {pairs(c.extraVars) && (
            <Row label="Extra vars">
              <Code>{pairs(c.extraVars)}</Code>
            </Row>
          )}
          <Row label="Options">
            {[
              c.options.become && 'become',
              c.options.check && 'check mode',
              `forks ${c.options.forks}`,
              ...c.options.tags.map((t) => `tag ${t}`),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Row>
          <Row label="Vault secrets">{secrets(c.secrets)}</Row>
          <Row label="Output">None. Only the error path can be connected.</Row>
        </>
      )
      break
    }
    case 'ai': {
      const c = step.data.config
      rows = (
        <>
          <Row label="Model">
            <span className="font-mono text-xs">{c.model}</span>
          </Row>
          <Row label="Prompt">
            <Code>{c.prompt}</Code>
          </Row>
          <Row label="Input">
            <span className="font-mono text-xs">{c.input}</span>
          </Row>
          <Row label="Max tokens">{c.maxTokens}</Row>
          <Row label="Output">Text. Vault secrets can't be used here.</Row>
        </>
      )
      break
    }
    case 'apiCall': {
      const c = step.data.config
      rows = (
        <>
          <Row label="Request">
            <span className="font-mono text-xs break-all">
              {c.method} {c.url}
            </span>
          </Row>
          {pairs(c.headers) && (
            <Row label="Headers">
              <Code>{pairs(c.headers)}</Code>
            </Row>
          )}
          {c.body && (
            <Row label="Body">
              <Code>{c.body}</Code>
            </Row>
          )}
          <Row label="Output">Parsed as {c.returnType}</Row>
          <Row label="Timeout">{c.timeoutSeconds}s</Row>
          <Row label="Approval">{approval(c.approval)}</Row>
          <Row label="Vault secrets">{secrets(c.secrets)}</Row>
        </>
      )
      break
    }
    case 'parser': {
      const c = step.data.config
      const op = c.operation
      rows = (
        <>
          <Row label="Input">
            {c.inputFormat}
            {c.trim && ', trimmed'}
          </Row>
          <Row label="Does">
            {op.kind === 'extract' ? (
              <Code>{op.fields.map((f) => `${f.name} ← ${f.path}`).join('\n')}</Code>
            ) : op.kind === 'regex' ? (
              <code className="font-mono text-xs">{op.pattern}</code>
            ) : (
              {
                toJson: 'Convert to JSON',
                toInt: 'Convert to integer',
                toFloat: 'Convert to number',
                toBool: 'Convert to true/false',
              }[op.kind]
            )}
          </Row>
          <Row label="On error">{c.onError.kind === 'fail' ? 'Fail the step' : `Use "${c.onError.value}"`}</Row>
          <Row label="Output">
            <code className="font-mono text-xs">{'{ ok, value, error }'}</code>
          </Row>
        </>
      )
      break
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon size={28} className={`shrink-0 ${info.color}`} aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-text">{step.data.label}</h2>
          <p className="text-xs text-text-muted">{info.label}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">{rows}</dl>
      {runStep && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="flex items-center gap-2 text-sm text-text">
            In this run <Badge tone={STEP_STATUS[runStep.status].tone}>{STEP_STATUS[runStep.status].label}</Badge>
            {runStep.durationMs !== null && <span className="text-xs text-text-muted">{runStep.durationMs} ms</span>}
          </p>
          {runStep.output && <Code>{runStep.output}</Code>}
          {runStep.error && <p className="text-sm text-danger">{runStep.error}</p>}
        </div>
      )}
    </div>
  )
}
