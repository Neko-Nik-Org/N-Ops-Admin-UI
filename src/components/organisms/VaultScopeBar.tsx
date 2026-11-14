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
/** Project and service switcher at the top of each Vault page, with create, rename and delete. */

import { FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { LoadingButton, useAsyncAction } from '@/components/loading'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import {
  useCreateProject,
  useCreateService,
  useDeleteProject,
  useDeleteService,
  useProjectContents,
  useUpdateProject,
  useUpdateService,
  useVaultScope,
} from '@/features/vault/hooks/useVault'
import type { VaultContainerInput, VaultProject, VaultService } from '@/features/vault/types'
import { cn } from '@/utils/cn'

/** What the name / description dialog is doing. */
type EditState =
  | { kind: 'closed' }
  | { kind: 'project'; project?: VaultProject }
  | { kind: 'service'; projectId: number; service?: VaultService }

/** Name + description form for a project or service. */
const ContainerForm = ({
  state,
  onClose,
  onCreated,
}: {
  state: Exclude<EditState, { kind: 'closed' }>
  onClose: () => void
  onCreated: (id: number) => void
}) => {
  const existing = state.kind === 'project' ? state.project : state.service
  const [name, setName] = useState(existing ? ('projectName' in existing ? existing.projectName : existing.serviceName) : '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync: createProject } = useCreateProject()
  const { mutateAsync: updateProject } = useUpdateProject()
  const { mutateAsync: createService } = useCreateService()
  const { mutateAsync: updateService } = useUpdateService()

  const [saveState, save] = useAsyncAction(
    async (input: VaultContainerInput): Promise<number | null> => {
      if (state.kind === 'project') {
        if (state.project) return updateProject({ id: state.project.projectId, input }).then(() => null)
        return (await createProject(input)).projectId
      }
      if (state.service) return updateService({ id: state.service.serviceId, input }).then(() => null)
      return (await createService({ projectId: state.projectId, input })).serviceId
    },
    { successMs: 400 },
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) {
      setError('Enter a name.')
      return
    }
    setError(null)
    save({ name: clean, description: description.trim() })
      .then((id) => {
        toast.success(existing ? `Saved ${clean}.` : `Created ${clean}.`)
        if (id !== null) onCreated(id)
        setTimeout(onClose, 400)
      })
      .catch((err: Error) => setError(err.message))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <FormField id="containerName" label="Name" error={error ?? undefined}>
        <Input
          id="containerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={state.kind === 'project' ? 'payments-api' : 'worker'}
          autoComplete="off"
          spellCheck={false}
          autoFocus
          hasError={!!error}
        />
      </FormField>
      <FormField id="containerDescription" label="Description">
        <Input
          id="containerDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          autoComplete="off"
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={saveState} loadingText="Saving" successText="Saved">
          {existing ? 'Save' : `Create ${state.kind}`}
        </LoadingButton>
      </div>
    </form>
  )
}

/** Delete-project confirmation that spells out everything that goes with it. */
const DeleteProjectDialog = ({
  project,
  onClose,
  onDeleted,
}: {
  project: VaultProject | null
  onClose: () => void
  onDeleted: () => void
}) => {
  const { data: contents } = useProjectContents(project?.projectId ?? null)
  const { mutateAsync: remove } = useDeleteProject()
  return (
    <ConfirmDialog
      open={!!project}
      title="Delete project"
      confirmLabel="Delete project"
      successMessage={`Deleted ${project?.projectName}.`}
      onConfirm={() => remove(project!.projectId).then(onDeleted)}
      onClose={onClose}
    >
      <p>
        Delete <span className="font-medium text-text">{project?.projectName}</span> and everything in it
        {contents
          ? `: ${contents.services} services, ${contents.secrets} keys, ${contents.configs} config files and ${contents.notes} notes, with all their versions`
          : ''}
        ? Anything reading these secrets stops working. This can't be undone.
      </p>
    </ConfirmDialog>
  )
}

/**
 * Project picker plus, when `withServices`, a row of service tabs. Selection is remembered and
 * shared across the Keys, Config files and Notes pages.
 */
export const VaultScopeBar = ({
  scope,
  withServices = true,
}: {
  scope: ReturnType<typeof useVaultScope>
  withServices?: boolean
}) => {
  const { projects, services, project, service, selectProject, selectService } = scope
  const [edit, setEdit] = useState<EditState>({ kind: 'closed' })
  const [deletingProject, setDeletingProject] = useState<VaultProject | null>(null)
  const [deletingService, setDeletingService] = useState<VaultService | null>(null)
  const { mutateAsync: removeService } = useDeleteService()
  const closeEdit = () => setEdit({ kind: 'closed' })

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="vaultProject" className="text-sm text-text-muted">
          Project
        </label>
        <Select
          id="vaultProject"
          value={project?.projectId ?? ''}
          onChange={(e) => selectProject(Number(e.target.value))}
          className="w-56"
          disabled={!projects?.length}
        >
          {!projects?.length && <option value="">No projects yet</option>}
          {projects?.map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.projectName}
            </option>
          ))}
        </Select>
        {project && (
          <>
            <LoadingButton
              variant="ghost"
              size="sm"
              icon={<Pencil size={14} />}
              aria-label={`Rename ${project.projectName}`}
              title="Rename project"
              onClick={() => setEdit({ kind: 'project', project })}
            />
            <LoadingButton
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              aria-label={`Delete ${project.projectName}`}
              title="Delete project"
              onClick={() => setDeletingProject(project)}
            />
          </>
        )}
        <LoadingButton variant="ghost" size="sm" icon={<FolderPlus size={14} />} onClick={() => setEdit({ kind: 'project' })}>
          New project
        </LoadingButton>
        {project?.description && <p className="w-full text-xs text-text-muted sm:ml-auto sm:w-auto">{project.description}</p>}
      </div>

      {withServices && project && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3" role="tablist" aria-label="Services">
          {services?.map((s) => {
            const active = s.serviceId === service?.serviceId
            return (
              <span key={s.serviceId} className="inline-flex items-center">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectService(s.serviceId)}
                  title={s.description || undefined}
                  className={cn(
                    'rounded-md px-3 py-1.5 font-mono text-sm transition-colors',
                    active ? 'bg-signal/15 font-medium text-signal' : 'text-text-muted hover:bg-ink hover:text-text',
                  )}
                >
                  {s.serviceName}
                </button>
                {active && (
                  <>
                    <LoadingButton
                      variant="ghost"
                      size="sm"
                      icon={<Pencil size={13} />}
                      aria-label={`Rename ${s.serviceName}`}
                      title="Rename service"
                      onClick={() => setEdit({ kind: 'service', projectId: project.projectId, service: s })}
                    />
                    <LoadingButton
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={13} />}
                      aria-label={`Delete ${s.serviceName}`}
                      title="Delete service"
                      onClick={() => setDeletingService(s)}
                    />
                  </>
                )}
              </span>
            )
          })}
          <LoadingButton
            variant="ghost"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setEdit({ kind: 'service', projectId: project.projectId })}
          >
            New service
          </LoadingButton>
        </div>
      )}

      <Dialog
        open={edit.kind !== 'closed'}
        onClose={closeEdit}
        title={
          edit.kind === 'project'
            ? edit.project
              ? 'Rename project'
              : 'New project'
            : edit.kind === 'service'
              ? edit.service
                ? 'Rename service'
                : 'New service'
              : ''
        }
        description={
          edit.kind === 'project' && !edit.project
            ? 'A project holds services, and each service holds keys and config files. Notes belong to the project.'
            : undefined
        }
      >
        {edit.kind !== 'closed' && (
          <ContainerForm
            state={edit}
            onClose={closeEdit}
            onCreated={(id) => (edit.kind === 'project' ? selectProject(id) : selectService(id))}
          />
        )}
      </Dialog>
      <DeleteProjectDialog project={deletingProject} onClose={() => setDeletingProject(null)} onDeleted={() => undefined} />
      <ConfirmDialog
        open={!!deletingService}
        title="Delete service"
        confirmLabel="Delete service"
        successMessage={`Deleted ${deletingService?.serviceName}.`}
        onConfirm={() => removeService(deletingService!.serviceId)}
        onClose={() => setDeletingService(null)}
      >
        <p>
          Delete <span className="font-medium text-text">{deletingService?.serviceName}</span> with all its keys and config files,
          and every version of them? This can't be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}
