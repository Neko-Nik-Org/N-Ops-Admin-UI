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
/** React Query hooks for the Vault. Every change refreshes the vault data and the admin audit log. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAtom } from 'jotai'
import {
  createConfig,
  deleteConfig,
  getConfigVersion,
  listConfigs,
  listConfigVersions,
  rollbackConfig,
  saveConfigVersion,
} from '../api/configs'
import {
  createNote,
  createNoteLink,
  deleteNote,
  deleteNoteLink,
  listNotes,
  listNoteVersions,
  openNote,
  setNoteShares,
  updateNote,
} from '../api/notes'
import {
  createProject,
  createService,
  deleteProject,
  deleteService,
  getProjectContents,
  listProjects,
  listServices,
  updateProject,
  updateService,
} from '../api/projects'
import {
  addSecretVersion,
  createSecret,
  deleteSecret,
  exportDotenv,
  importDotenv,
  listSecrets,
  listSecretVersions,
  revealSecret,
  rollbackSecret,
} from '../api/secrets'
import { vaultProjectIdAtom, vaultServiceIdAtom } from '../store/scope'
import type { ConfigFileInput, NoteInput, NoteLinkInput, NoteShare, SecretInput, VaultContainerInput } from '../types'

/** Wraps a mutation function so success refreshes everything under ['vault'] and ['admin'] (audit log, usage). */
const useVaultMutation = <V, R>(fn: (vars: V) => Promise<R>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vault'] }),
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
      ]),
  })
}

// ── Projects and services ────────────────────────────────

export const useVaultProjects = () => useQuery({ queryKey: ['vault', 'projects'], queryFn: listProjects })

export const useVaultServices = (projectId: number | null) =>
  useQuery({ queryKey: ['vault', 'services', projectId], queryFn: () => listServices(projectId!), enabled: projectId !== null })

/**
 * The selected project and service, falling back to the first ones when nothing (or something
 * deleted) is remembered. `needsService: false` skips the service (the Notes page).
 */
export const useVaultScope = ({ needsService = true } = {}) => {
  const [storedProjectId, setProjectId] = useAtom(vaultProjectIdAtom)
  const [storedServiceId, setServiceId] = useAtom(vaultServiceIdAtom)
  const projects = useVaultProjects()
  const project = projects.data?.find((p) => p.projectId === storedProjectId) ?? projects.data?.[0] ?? null
  const services = useVaultServices(needsService ? (project?.projectId ?? null) : null)
  const service = services.data?.find((s) => s.serviceId === storedServiceId) ?? services.data?.[0] ?? null

  return {
    projects: projects.data,
    services: services.data,
    project,
    service,
    isLoading: projects.isLoading || (needsService && !!project && services.isLoading),
    error: projects.error ?? services.error,
    selectProject: (id: number) => {
      setProjectId(id)
      setServiceId(null)
    },
    selectService: setServiceId,
  }
}

/** What deleting a project would remove; loaded only while the confirmation is open. */
export const useProjectContents = (projectId: number | null) =>
  useQuery({
    queryKey: ['vault', 'project-contents', projectId],
    queryFn: () => getProjectContents(projectId!),
    enabled: projectId !== null,
  })

export const useCreateProject = () => useVaultMutation((input: VaultContainerInput) => createProject(input))
export const useUpdateProject = () =>
  useVaultMutation(({ id, input }: { id: number; input: VaultContainerInput }) => updateProject(id, input))
export const useDeleteProject = () => useVaultMutation((id: number) => deleteProject(id))
export const useCreateService = () =>
  useVaultMutation(({ projectId, input }: { projectId: number; input: VaultContainerInput }) => createService(projectId, input))
export const useUpdateService = () =>
  useVaultMutation(({ id, input }: { id: number; input: VaultContainerInput }) => updateService(id, input))
export const useDeleteService = () => useVaultMutation((id: number) => deleteService(id))

// ── Keys store ───────────────────────────────────────────

export const useSecrets = (serviceId: number | null) =>
  useQuery({ queryKey: ['vault', 'secrets', serviceId], queryFn: () => listSecrets(serviceId!), enabled: serviceId !== null })

export const useSecretVersions = (secretId: number | null) =>
  useQuery({
    queryKey: ['vault', 'secret-versions', secretId],
    queryFn: () => listSecretVersions(secretId!),
    enabled: secretId !== null,
  })

/** Reveals a value (default: the version in use). Each reveal is audited, so only the audit log is refreshed. */
export const useRevealSecret = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ secretId, version }: { secretId: number; version?: number }) => revealSecret(secretId, version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] }),
  })
}

export const useCreateSecret = () =>
  useVaultMutation(({ serviceId, input }: { serviceId: number; input: SecretInput }) => createSecret(serviceId, input))
export const useAddSecretVersion = () =>
  useVaultMutation(({ secretId, value, note }: { secretId: number; value: string; note: string }) =>
    addSecretVersion(secretId, value, note),
  )
export const useRollbackSecret = () =>
  useVaultMutation(({ secretId, version }: { secretId: number; version: number }) => rollbackSecret(secretId, version))
export const useDeleteSecret = () => useVaultMutation((secretId: number) => deleteSecret(secretId))
export const useImportDotenv = () =>
  useVaultMutation(({ serviceId, tagId, text, note }: { serviceId: number; tagId: number; text: string; note: string }) =>
    importDotenv(serviceId, tagId, text, note),
  )
export const useExportDotenv = () =>
  useVaultMutation(({ serviceId, tagId }: { serviceId: number; tagId: number }) => exportDotenv(serviceId, tagId))

// ── Config files ─────────────────────────────────────────

export const useConfigs = (serviceId: number | null) =>
  useQuery({ queryKey: ['vault', 'configs', serviceId], queryFn: () => listConfigs(serviceId!), enabled: serviceId !== null })

/** A version's content (null version = current). `stamp` (e.g. currentVersion) refetches when the file changes. */
export const useConfigContent = (fileId: number | null, version: number | null, stamp?: number) =>
  useQuery({
    queryKey: ['vault', 'config', fileId, version ?? 'current', stamp],
    queryFn: () => getConfigVersion(fileId!, version ?? undefined),
    enabled: fileId !== null,
    staleTime: Infinity,
  })

export const useConfigVersions = (fileId: number | null) =>
  useQuery({
    queryKey: ['vault', 'config-versions', fileId],
    queryFn: () => listConfigVersions(fileId!),
    enabled: fileId !== null,
  })

export const useCreateConfig = () =>
  useVaultMutation(({ serviceId, input }: { serviceId: number; input: ConfigFileInput }) => createConfig(serviceId, input))
export const useSaveConfig = () =>
  useVaultMutation(({ fileId, content, note }: { fileId: number; content: string; note: string }) =>
    saveConfigVersion(fileId, content, note),
  )
export const useRollbackConfig = () =>
  useVaultMutation(({ fileId, version }: { fileId: number; version: number }) => rollbackConfig(fileId, version))
export const useDeleteConfig = () => useVaultMutation((fileId: number) => deleteConfig(fileId))

// ── Secure notes ─────────────────────────────────────────

export const useNotes = (projectId: number | null) =>
  useQuery({ queryKey: ['vault', 'notes', projectId], queryFn: () => listNotes(projectId!), enabled: projectId !== null })

/**
 * The latest version of a note. The password is never part of the cache key; `stamp` (the latest
 * version number plus an unlock-attempt counter) refetches after a save or a new password. Disabled
 * while a locked note has no password yet.
 */
export const useNoteContent = (noteId: number | null, password: string | undefined, enabled: boolean, stamp?: string | number) =>
  useQuery({
    queryKey: ['vault', 'note', noteId, stamp],
    queryFn: () => openNote(noteId!, password),
    enabled: noteId !== null && enabled,
    retry: false,
    staleTime: Infinity,
  })

export const useNoteVersions = (noteId: number | null, password: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['vault', 'note-versions', noteId],
    queryFn: () => listNoteVersions(noteId!, password),
    enabled: noteId !== null && enabled,
    retry: false,
  })

export const useCreateNote = () =>
  useVaultMutation(({ projectId, input }: { projectId: number; input: NoteInput }) => createNote(projectId, input))
export const useUpdateNote = () =>
  useVaultMutation(({ noteId, input, password }: { noteId: number; input: NoteInput; password?: string }) =>
    updateNote(noteId, input, password),
  )
export const useDeleteNote = () => useVaultMutation((noteId: number) => deleteNote(noteId))
export const useSetNoteShares = () =>
  useVaultMutation(({ noteId, shares }: { noteId: number; shares: Array<Pick<NoteShare, 'userId' | 'canEdit'>> }) =>
    setNoteShares(noteId, shares),
  )
export const useCreateNoteLink = () =>
  useVaultMutation(({ noteId, input }: { noteId: number; input: NoteLinkInput }) => createNoteLink(noteId, input))
export const useDeleteNoteLink = () =>
  useVaultMutation(({ noteId, shareId }: { noteId: number; shareId: string }) => deleteNoteLink(noteId, shareId))
