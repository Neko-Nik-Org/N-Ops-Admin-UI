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
 * A workflow drawn with React Flow (reactflow.dev). Read-only for now: pan, zoom and click a step
 * to see its settings. When a run is picked, each step shows how it went in that run.
 */

import '@xyflow/react/dist/style.css'
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react'
import { useAtomValue } from 'jotai'
import { useMemo, type CSSProperties } from 'react'
import { resolvedThemeAtom } from '@/app/theme'
import { NODE_TYPES, nodeSummary } from '@/features/workflows/describe'
import { NODE_HANDLES } from '@/features/workflows/api/workflows'
import type { EdgeHandle, StepStatus, Workflow, WorkflowNode } from '@/features/workflows/types'
import { LOW_POWER } from '@/lib/lowPower'
import { cn } from '@/utils/cn'

const STATUS_RING: Record<StepStatus, string> = {
  success: 'border-signal ring-1 ring-signal/40',
  failed: 'border-danger ring-1 ring-danger/40',
  waiting_approval: 'border-warning ring-1 ring-warning/40',
  running: 'border-accent-secondary ring-1 ring-accent-secondary/40',
  skipped: 'opacity-50',
}

/** Where each outgoing handle sits on the card. */
const HANDLE_POSITION: Record<Exclude<EdgeHandle, never>, { position: Position; style?: CSSProperties; dot: string }> = {
  out: { position: Position.Right, dot: '!bg-signal' },
  true: { position: Position.Right, style: { top: '35%' }, dot: '!bg-signal' },
  false: { position: Position.Right, style: { top: '70%' }, dot: '!bg-text-muted' },
  error: { position: Position.Bottom, dot: '!bg-danger' },
}

type StepNodeData = { step: WorkflowNode; status?: StepStatus }
type StepFlowNode = Node<StepNodeData, 'step'>

const StepNode = ({ data, selected }: NodeProps<StepFlowNode>) => {
  const { step, status } = data
  const info = NODE_TYPES[step.type]
  const Icon = info.icon
  return (
    <div
      className={cn(
        'w-60 rounded-lg border bg-surface-raised px-3 py-2.5 text-left shadow-sm transition-shadow',
        status ? STATUS_RING[status] : 'border-border-strong',
        selected && 'outline-2 outline-offset-2 outline-signal',
      )}
    >
      {step.type !== 'trigger' && (
        <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-border-strong" />
      )}
      <div className="flex items-center gap-1.5 text-[0.6875rem] tracking-wide text-text-muted uppercase">
        <Icon size={13} className={info.color} aria-hidden="true" />
        {info.label}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-text">{step.data.label}</p>
      <p className="mt-0.5 truncate font-mono text-[0.6875rem] text-text-muted">{nodeSummary(step)}</p>
      {NODE_HANDLES[step.type].map((h) => (
        <Handle
          key={h}
          id={h}
          type="source"
          position={HANDLE_POSITION[h].position}
          style={HANDLE_POSITION[h].style}
          className={cn('!size-2 !border-0', HANDLE_POSITION[h].dot)}
        />
      ))}
    </div>
  )
}

const nodeTypes = { step: StepNode }

const EDGE_COLOR: Record<EdgeHandle, string> = {
  out: 'var(--color-border-strong)',
  true: 'var(--color-signal)',
  false: 'var(--color-text-muted)',
  error: 'var(--color-danger)',
}

export const WorkflowCanvas = ({
  workflow,
  statuses,
  selectedNodeId,
  onSelect,
}: {
  workflow: Workflow
  /** Step statuses from the picked run, by node id. */
  statuses?: Readonly<Record<string, StepStatus>>
  selectedNodeId: string | null
  onSelect: (nodeId: string | null) => void
}) => {
  const theme = useAtomValue(resolvedThemeAtom)

  const nodes = useMemo<StepFlowNode[]>(
    () =>
      workflow.nodes.map((n) => ({
        id: n.id,
        type: 'step',
        position: n.position,
        data: { step: n, status: statuses?.[n.id] },
        selected: n.id === selectedNodeId,
      })),
    [workflow.nodes, statuses, selectedNodeId],
  )

  const edges = useMemo<Edge[]>(
    () =>
      workflow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        type: 'smoothstep',
        label: e.sourceHandle === 'out' ? undefined : e.sourceHandle,
        labelStyle: { fill: EDGE_COLOR[e.sourceHandle], fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: 'var(--color-surface-raised)' },
        style: {
          stroke: EDGE_COLOR[e.sourceHandle],
          strokeWidth: 1.5,
          strokeDasharray: e.sourceHandle === 'error' ? '5 4' : undefined,
        },
        // the moving dashes repaint every frame, so they're off on low-power devices
        animated: !LOW_POWER && statuses?.[e.source] === 'success' && statuses?.[e.target] === 'success',
      })),
    [workflow.edges, statuses],
  )

  return (
    <div className="h-[28rem] overflow-hidden rounded-xl border border-border bg-surface lg:h-[34rem]">
      <ReactFlow
        aria-label={`Flow of ${workflow.name}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        onNodeClick={(_, n) => onSelect(n.id)}
        onPaneClick={() => onSelect(null)}
      >
        <Background gap={20} color="var(--color-border)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
