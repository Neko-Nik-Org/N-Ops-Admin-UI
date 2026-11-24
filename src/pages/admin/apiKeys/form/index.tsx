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
 * Admin › API keys › new or edit (/admin/api-keys/new and /admin/api-keys/:apiKeyId/edit): the key
 * form as its own page. After creating, the page shows the new key's secret once.
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonText } from '@/components/Skeleton'
import { PageToolbar } from '@/components/PageToolbar'
import { ApiKeyForm, SecretView } from '@/pages/admin/apiKeys/form/ApiKeyForm'
import { apiKeyPath, ROUTES } from '@/constants/routes'
import { useGoBack } from '@/hooks/useGoBack'
import { useApiKey } from '@/hooks/useApiKeys'
import { type CreatedApiKey } from '@/types/apiKey'

/** A positive whole-number id from the URL, else null. */
const idFrom = (value: string | undefined) => {
  const n = Number(value)
  return value && Number.isInteger(n) && n > 0 ? n : null
}

export const ApiKeyFormPage = () => {
  const params = useParams()
  const editing = params.apiKeyId !== undefined
  const editId = idFrom(params.apiKeyId)
  const { apiKey, isLoading, error } = useApiKey(editId)
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const navigate = useNavigate()

  const title = created
    ? `${created.apiKey.keyName} is ready`
    : editing
      ? apiKey
        ? `Edit ${apiKey.keyName}`
        : 'Edit API key'
      : 'New API key'
  // where Back, Cancel and a save lead when the page was opened directly; otherwise they return to the previous page
  const fallback = editing && editId ? apiKeyPath(editId) : ROUTES.adminApiKeys
  const back = useGoBack(fallback)

  const header = (
    <div className="flex flex-col gap-1">
      <PageToolbar crumbs={[{ label: 'API keys', to: ROUTES.adminApiKeys }, { label: title }]} back={fallback} />
      {/* the path above names the page; the heading is for screen readers */}
      <PageHeader title={title} mock />
    </div>
  )

  if (editing && editId && isLoading) return <SkeletonText lines={8} />
  if (editing && (!editId || error || !apiKey))
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="text-sm text-text-muted">
          {error ? `Couldn't load this key: ${error.message}` : "There's no API key here. It may have been deleted."}
        </p>
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      {header}
      {created ? (
        // Done opens the new key's page, replacing this one so Back doesn't return to the secret
        <SecretView created={created} onDone={() => navigate(apiKeyPath(created.apiKey.apiKeyId), { replace: true })} />
      ) : (
        <ApiKeyForm key={editId ?? 'new'} apiKey={apiKey} onSaved={back} onCancel={back} onCreated={setCreated} />
      )}
    </div>
  )
}
