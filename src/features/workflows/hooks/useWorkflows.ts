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
/** React Query hooks for Workflows. Every change refreshes workflow data and the admin audit log / usage. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  decideRunApproval,
  deleteWorkflow,
  getWorkflow,
  listVerifiedRecipients,
  listWorkflowRuns,
  listWorkflows,
  listWorkflowServers,
  runWorkflow,
  setWorkflowEnabled,
} from '../api/workflows'

const KEYS = {
  all: ['workflows'] as const,
  list: ['workflows', 'list'] as const,
  detail: (id: number) => ['workflows', 'detail', id] as const,
  runs: (id: number) => ['workflows', 'runs', id] as const,
  servers: ['workflows', 'servers'] as const,
  recipients: ['workflows', 'recipients'] as const,
}

const useWorkflowMutation = <V, R>(fn: (vars: V) => Promise<R>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
      ]),
  })
}

export const useWorkflows = () => useQuery({ queryKey: KEYS.list, queryFn: listWorkflows })

export const useWorkflow = (workflowId: number | null) =>
  useQuery({ queryKey: KEYS.detail(workflowId ?? 0), queryFn: () => getWorkflow(workflowId!), enabled: workflowId !== null })

export const useWorkflowRuns = (workflowId: number | null) =>
  useQuery({ queryKey: KEYS.runs(workflowId ?? 0), queryFn: () => listWorkflowRuns(workflowId!), enabled: workflowId !== null })

export const useWorkflowServers = () => useQuery({ queryKey: KEYS.servers, queryFn: listWorkflowServers, staleTime: Infinity })

export const useVerifiedRecipients = () =>
  useQuery({ queryKey: KEYS.recipients, queryFn: listVerifiedRecipients, staleTime: Infinity })

export const useSetWorkflowEnabled = () =>
  useWorkflowMutation(({ workflowId, enabled }: { workflowId: number; enabled: boolean }) =>
    setWorkflowEnabled(workflowId, enabled),
  )

export const useRunWorkflow = () => useWorkflowMutation((workflowId: number) => runWorkflow(workflowId))

export const useDecideApproval = () =>
  useWorkflowMutation(({ runId, approve }: { runId: number; approve: boolean }) => decideRunApproval(runId, approve))

export const useDeleteWorkflow = () => useWorkflowMutation((workflowId: number) => deleteWorkflow(workflowId))
