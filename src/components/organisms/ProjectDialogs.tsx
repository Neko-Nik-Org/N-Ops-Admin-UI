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
/** Vault project dialogs: create / rename, and delete with a summary of what goes with it. */

import { useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { errorStatus } from '@/types/api'
import { useCreateProject, useDeleteProject, useProjectContents, useUpdateProject } from '@/features/vault/hooks/useVault'
import type { VaultContainerInput, VaultProject } from '@/features/vault/types'

/** What the name / description dialog is doing. */
type EditState = { kind: 'closed' } | { kind: 'project'; project?: VaultProject }

/** Name + description form for a project. */
const ContainerForm = ({
  state,
  onClose,
  onCreated,
}: {
  state: Exclude<EditState, { kind: 'closed' }>
  onClose: () => void
  onCreated: (id: number) => void
}) => {
  const existing = state.project
  const [name, setName] = useState(existing?.projectName ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync: createProject } = useCreateProject()
  const { mutateAsync: updateProject } = useUpdateProject()

  const [saveState, save] = useAsyncAction(
    async (input: VaultContainerInput): Promise<number | null> => {
      if (state.project) return updateProject({ project: state.project, input }).then(() => null)
      return (await createProject(input)).projectId
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
      // the API reports a duplicate name only as a bare 417 database error
      .catch((err: Error) => setError(errorStatus(err) === 417 ? `A project called "${clean}" already exists.` : err.message))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <FormField id="containerName" label="Name" error={error ?? undefined}>
        <Input
          id="containerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="payments-api"
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
          {existing ? 'Save' : 'Create project'}
        </LoadingButton>
      </div>
    </form>
  )
}

/** Delete-project confirmation that spells out everything that goes with it. */
export const DeleteProjectDialog = ({
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
          ? `: ${contents.secrets} keys, ${contents.configs} config files and ${contents.notes} notes, with all their versions`
          : ''}
        ? Everything in it is removed permanently, and anything reading these secrets stops working. This can't be undone.
      </p>
    </ConfirmDialog>
  )
}

/** Creates a project, or renames `project` when given. */
export const ProjectFormDialog = ({
  open,
  project,
  onClose,
  onCreated,
}: {
  open: boolean
  project?: VaultProject
  onClose: () => void
  onCreated?: (id: number) => void
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={project ? 'Rename project' : 'New project'}
    description={
      project
        ? undefined
        : 'A project is a folder holding Env secrets, Conf files and Notes. Tags keep environments like production and staging apart; notes are private to whoever writes them.'
    }
  >
    {open && <ContainerForm state={{ kind: 'project', project }} onClose={onClose} onCreated={(id) => onCreated?.(id)} />}
  </Dialog>
)
