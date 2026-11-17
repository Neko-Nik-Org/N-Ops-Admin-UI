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
import { forgetProjectContents, getProjectContents } from '../api/projects'
import { createVaultProjectAndFind, deleteVaultProject, listVaultProjects, updateVaultProject } from '../api/vaultProjects'
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
import type {
  ConfigFileInput,
  NoteInput,
  NoteLinkInput,
  NoteShare,
  SecretInput,
  VaultContainerInput,
  VaultProject,
} from '../types'

/** Wraps a mutation function so success refreshes everything under ['vault'] and ['admin'] (audit log, usage). */
const useVaultMutation = <V, R>(fn: (vars: V) => Promise<R>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vault'] }),
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        // the real org-info counts vault projects
        queryClient.invalidateQueries({ queryKey: ['user-self', 'org-info'] }),
      ]),
  })
}

// ── Projects ─────────────────────────────────────────────

/** The organization's vault projects, from `GET /vault/project/list` (needs `vault:project:view`). */
export const useVaultProjects = () => useQuery({ queryKey: ['vault', 'projects'], queryFn: listVaultProjects, retry: false })

/** What deleting a project would remove; loaded only while the confirmation is open. */
export const useProjectContents = (projectId: number | null) =>
  useQuery({
    queryKey: ['vault', 'project-contents', projectId],
    queryFn: () => getProjectContents(projectId!),
    enabled: projectId !== null,
  })

/** Creates a project (live API) and resolves with it, so the caller can select it. */
export const useCreateProject = () => useVaultMutation((input: VaultContainerInput) => createVaultProjectAndFind(input))

/** Renames / re-describes `project`, keeping its other `details` keys. */
export const useUpdateProject = () =>
  useVaultMutation(({ project, input }: { project: VaultProject; input: VaultContainerInput }) =>
    updateVaultProject(project.projectId, input, project.details),
  )

/** Deletes a project (live API), then drops the mock keys, files and notes that were inside it. */
export const useDeleteProject = () =>
  useVaultMutation(async (id: number) => {
    await deleteVaultProject(id)
    forgetProjectContents(id)
  })

// ── Env (secret keys) ───────────────────────────────────────────

export const useSecrets = (projectId: number | null) =>
  useQuery({ queryKey: ['vault', 'secrets', projectId], queryFn: () => listSecrets(projectId!), enabled: projectId !== null })

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
  useVaultMutation(({ projectId, input }: { projectId: number; input: SecretInput }) => createSecret(projectId, input))
export const useAddSecretVersion = () =>
  useVaultMutation(({ secretId, value, note, isHidden }: { secretId: number; value: string; note: string; isHidden: boolean }) =>
    addSecretVersion(secretId, value, note, isHidden),
  )
export const useRollbackSecret = () =>
  useVaultMutation(({ secretId, version }: { secretId: number; version: number }) => rollbackSecret(secretId, version))
export const useDeleteSecret = () => useVaultMutation((secretId: number) => deleteSecret(secretId))
export const useImportDotenv = () =>
  useVaultMutation(({ projectId, tagId, text, note }: { projectId: number; tagId: number; text: string; note: string }) =>
    importDotenv(projectId, tagId, text, note),
  )
export const useExportDotenv = () =>
  useVaultMutation(({ projectId, tagId }: { projectId: number; tagId: number }) => exportDotenv(projectId, tagId))

// ── Conf (config files) ─────────────────────────────────────────

export const useConfigs = (projectId: number | null) =>
  useQuery({ queryKey: ['vault', 'configs', projectId], queryFn: () => listConfigs(projectId!), enabled: projectId !== null })

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
  useVaultMutation(({ projectId, input }: { projectId: number; input: ConfigFileInput }) => createConfig(projectId, input))
export const useSaveConfig = () =>
  useVaultMutation(({ fileId, content, note }: { fileId: number; content: string; note: string }) =>
    saveConfigVersion(fileId, content, note),
  )
export const useRollbackConfig = () =>
  useVaultMutation(({ fileId, version }: { fileId: number; version: number }) => rollbackConfig(fileId, version))
export const useDeleteConfig = () => useVaultMutation((fileId: number) => deleteConfig(fileId))

// ── Notes ─────────────────────────────────────────

export const useNotes = (projectId: number | null) =>
  useQuery({ queryKey: ['vault', 'notes', projectId], queryFn: () => listNotes(projectId!), enabled: projectId !== null })

/** The latest version of a note; `stamp` (its latest version number) refetches after a save. */
export const useNoteContent = (noteId: number | null, stamp?: number) =>
  useQuery({
    queryKey: ['vault', 'note', noteId, stamp],
    queryFn: () => openNote(noteId!),
    enabled: noteId !== null,
    retry: false,
    staleTime: Infinity,
  })

export const useNoteVersions = (noteId: number | null) =>
  useQuery({
    queryKey: ['vault', 'note-versions', noteId],
    queryFn: () => listNoteVersions(noteId!),
    enabled: noteId !== null,
    retry: false,
  })

export const useCreateNote = () =>
  useVaultMutation(({ projectId, input }: { projectId: number; input: NoteInput }) => createNote(projectId, input))
export const useUpdateNote = () =>
  useVaultMutation(({ noteId, input }: { noteId: number; input: NoteInput }) => updateNote(noteId, input))
export const useDeleteNote = () => useVaultMutation((noteId: number) => deleteNote(noteId))
export const useSetNoteShares = () =>
  useVaultMutation(({ noteId, shares }: { noteId: number; shares: Array<Pick<NoteShare, 'userId' | 'canEdit'>> }) =>
    setNoteShares(noteId, shares),
  )
export const useCreateNoteLink = () =>
  useVaultMutation(({ noteId, input }: { noteId: number; input: NoteLinkInput }) => createNoteLink(noteId, input))
export const useDeleteNoteLink = () =>
  useVaultMutation(({ noteId, shareId }: { noteId: number; shareId: string }) => deleteNoteLink(noteId, shareId))
