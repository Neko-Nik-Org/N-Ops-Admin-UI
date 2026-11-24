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
/** Admin › API keys › one key (/admin/api-keys/:apiKeyId): its status, role and scope, with Edit and Delete. */

import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingButton } from '@/components/LoadingButton'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonText } from '@/components/Skeleton'
import { PageToolbar, type Crumb } from '@/components/PageToolbar'
import { ApiKeyDeleteImpact, ApiKeyDetails } from '@/pages/admin/apiKeys/ApiKeyDetails'
import { apiKeyEditPath, ROUTES } from '@/constants/routes'
import { useApiKey, useDeleteApiKey } from '@/hooks/useApiKeys'

/** "API keys › <current>". */
const crumbs = (current: string): Crumb[] => [{ label: 'API keys', to: ROUTES.adminApiKeys }, { label: current }]

export const ApiKeyDetailPage = () => {
  const apiKeyId = Number(useParams().apiKeyId)
  const valid = Number.isInteger(apiKeyId) && apiKeyId > 0
  const { apiKey, isLoading, error } = useApiKey(valid ? apiKeyId : null)
  const { mutateAsync: remove } = useDeleteApiKey()
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  if (valid && isLoading) return <SkeletonText lines={6} />
  if (!valid || error || !apiKey)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Not found')} back={ROUTES.adminApiKeys} />
        <p className="text-sm text-text-muted">
          {error ? `Couldn't load this key: ${error.message}` : "There's no API key here. It may have been deleted."}
        </p>
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageToolbar
          crumbs={crumbs(apiKey.keyName)}
          back={ROUTES.adminApiKeys}
          actions={
            <>
              <LoadingButton variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleting(true)}>
                Delete
              </LoadingButton>
              <LoadingButton size="sm" icon={<Pencil size={14} />} onClick={() => navigate(apiKeyEditPath(apiKey.apiKeyId))}>
                Edit
              </LoadingButton>
            </>
          }
        />
        <PageHeader title={apiKey.keyName} showTitle mock description={apiKey.keyDescription || undefined} />
      </div>

      <ApiKeyDetails apiKey={apiKey} />

      <ConfirmDialog
        open={deleting}
        title="Delete API key"
        confirmLabel="Delete key"
        successMessage={`Deleted ${apiKey.keyName}.`}
        onConfirm={() => remove(apiKey.apiKeyId).then(() => setTimeout(() => navigate(ROUTES.adminApiKeys), 500))}
        onClose={() => setDeleting(false)}
      >
        <ApiKeyDeleteImpact apiKey={apiKey} />
      </ConfirmDialog>
    </div>
  )
}
