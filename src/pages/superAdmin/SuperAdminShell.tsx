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
 * Layout for the super-admin pages (/super-admin). They don't use a user's sign-in: the API checks
 * the server's admin key instead, so this asks for it first and keeps it in memory for the tab.
 * Not linked from anywhere in the app.
 */

import { yupResolver } from '@hookform/resolvers/yup'
import { useAtom } from 'jotai'
import { KeyRound, LogOut, ShieldAlert } from 'lucide-react'
import { RESET } from 'jotai/utils'
import { useForm } from 'react-hook-form'
import { Link, Outlet } from 'react-router-dom'
import * as yup from 'yup'
import { Input } from '@/components/Input'
import { NLogo } from '@/components/NLogo'
import { FormField } from '@/components/FormField'
import { LoadingButton } from '@/components/LoadingButton'
import { ThemeMenu } from '@/components/ThemeMenu'
import { ROUTES } from '@/constants/routes'
import { InvalidAdminKeyError } from '@/api/organizations'
import { useCheckAdminKey } from '@/hooks/useOrganizations'
import { superAdminKeyAtom } from '@/store/adminKey'
import { useAsyncAction } from '@/hooks/useAsyncAction'

const keySchema = yup.object({ adminKey: yup.string().trim().required('Enter the admin key.') })
type KeyFormValues = yup.InferType<typeof keySchema>

/** Asks for the admin key and checks it with the API before letting anyone in. */
const KeyGate = ({ onAccepted }: { onAccepted: (key: string) => void }) => {
  const checkAdminKey = useCheckAdminKey()
  const [state, check] = useAsyncAction(checkAdminKey, { successMs: 300 })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<KeyFormValues>({ resolver: yupResolver(keySchema), defaultValues: { adminKey: '' } })

  const onSubmit = ({ adminKey }: KeyFormValues) =>
    check(adminKey)
      .then(() => onAccepted(adminKey))
      .catch((error: Error) =>
        setError('adminKey', {
          message: error instanceof InvalidAdminKeyError ? error.message : `Couldn't check the key: ${error.message}`,
        }),
      )

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5 rounded-xl border border-border bg-surface-raised p-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-text">
          <KeyRound size={18} aria-hidden="true" /> Super admin
        </h1>
        <p className="text-sm text-text-muted">
          Enter the API's super-admin key (SUPER_ADMIN_KEY). It's kept, encrypted, until you leave these pages or choose “Forget
          key”.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField id="adminKey" label="Admin key" error={errors.adminKey?.message}>
          <Input
            id="adminKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            hasError={!!errors.adminKey}
            {...register('adminKey')}
          />
        </FormField>
        <LoadingButton type="submit" state={state} loadingText="Checking" successText="Accepted">
          Continue
        </LoadingButton>
      </form>
    </div>
  )
}

export const SuperAdminShell = () => {
  const [adminKey, setAdminKey] = useAtom(superAdminKeyAtom)

  return (
    <div className="min-h-dvh bg-ink text-text">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <Link to={ROUTES.superAdmin} className="flex items-center gap-2 font-semibold text-text">
          <NLogo size={26} />
          <span>N-Ops</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
            <ShieldAlert size={12} aria-hidden="true" /> Super admin
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeMenu />
          {adminKey && (
            <LoadingButton variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={() => setAdminKey(RESET)}>
              Forget key
            </LoadingButton>
          )}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        {adminKey ? <Outlet /> : <KeyGate onAccepted={setAdminKey} />}
      </main>
    </div>
  )
}
