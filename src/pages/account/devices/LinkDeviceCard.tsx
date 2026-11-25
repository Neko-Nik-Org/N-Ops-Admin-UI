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
 * "Link a mobile device" card: makes a one-time code for the N-Ops app, counts down its 5 minutes,
 * and watches for the app to use it. The app signs in with the user's id and the code
 * (`POST /auth/device/login`); the API then deletes the code, whether it matched or not. So a code
 * that disappears only means the app tried it: the card checks the device list to see if it worked.
 */

import { useAtomValue } from 'jotai'
import { QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { CopyButton } from '@/components/CopyButton'
import { LoadingButton } from '@/components/LoadingButton'
import { DEVICE_TOKEN_TTL_MS } from '@/api/devices'
import { AccountCard } from '@/pages/account/AccountCard'
import {
  DEVICE_TOKEN_POLL_MS,
  useDevices,
  useGenerateDeviceToken,
  usePendingDeviceToken,
  useRevokeDeviceToken,
  useSessionInfo,
} from '@/hooks/useDevices'
import { currentUserAtom } from '@/store/session'
import { errorStatus } from '@/types/api'
import { deviceLinkPayload } from '@/utils/deviceLink'
import { env } from '@/utils/env'

/** The code on screen, when it stops working, and the devices linked before it was made. */
interface ShownCode {
  token: string
  expiresAt: number
  knownDevices: ReadonlySet<number>
}

/** What happened to the last code, shown under the button. */
type Outcome = 'linked' | 'expired' | 'failed' | null

/**
 * The countdown ends this much before the API's 5 minutes, which start a moment earlier (when the API
 * makes the code). Without it, a code expiring on the API would look the same as one the app tried.
 */
const EXPIRY_MARGIN_MS = 5000

const POLICY_FORBIDS = "Your access policy doesn't allow the mobile app. Ask an admin if you need it."

/** "4:05". */
const formatLeft = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** One value the app needs, with a copy button. */
const CodeValue = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-text-muted">{label}</span>
    <span className="flex flex-wrap items-center gap-2">
      <code
        className="rounded-lg bg-ink px-4 py-2 font-mono text-lg tracking-wider break-all text-text select-all"
        aria-label={label}
      >
        {value}
      </code>
      <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} />
    </span>
  </div>
)

export const LinkDeviceCard = () => {
  const user = useAtomValue(currentUserAtom)
  const [code, setCode] = useState<ShownCode | null>(null)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [now, setNow] = useState(() => Date.now())
  const session = useSessionInfo()
  const devices = useDevices()
  const { refetch: refetchDevices } = devices
  const pending = usePendingDeviceToken()
  const { refetch: recheckPending } = pending
  const generate = useGenerateDeviceToken()
  const revoke = useRevokeDeviceToken()
  const { mutate: revokeCode } = revoke

  // While a code is shown: tick the countdown, and keep asking the API whether it still exists.
  // Gone before it ran out means the app tried it; a new device in the list means it worked.
  useEffect(() => {
    if (!code) return
    let done = false
    const finish = (result: Outcome) => {
      done = true
      setCode((shown) => (shown === code ? null : shown))
      setOutcome(result)
    }
    const tick = setInterval(() => {
      setNow(Date.now())
      if (!done && Date.now() >= code.expiresAt) {
        finish('expired')
        // and make sure it can't be used in the API's last few seconds
        revokeCode(undefined, { onError: () => void recheckPending() })
      }
    }, 1000)
    const poll = setInterval(() => {
      void recheckPending().then(async ({ data }) => {
        if (done || data !== false || Date.now() >= code.expiresAt) return
        done = true
        const { data: list } = await refetchDevices()
        if (list?.some((d) => !code.knownDevices.has(d.sessionId))) {
          finish('linked')
          toast.success('Device linked.')
        } else finish('failed')
      })
    }, DEVICE_TOKEN_POLL_MS)
    return () => {
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [code, recheckPending, refetchDevices, revokeCode])

  const makeCode = () => {
    setOutcome(null)
    const knownDevices = new Set((devices.data ?? []).map((d) => d.sessionId))
    generate.mutate(undefined, {
      onSuccess: (token) => {
        const at = Date.now()
        setNow(at)
        setCode({ token, expiresAt: at + DEVICE_TOKEN_TTL_MS - EXPIRY_MARGIN_MS, knownDevices })
      },
      // 403 also means a code is already waiting (made in another tab); the check shows that case
      onError: (error) => {
        if (errorStatus(error) === 403) void recheckPending()
      },
    })
  }

  const cancel = () =>
    revoke.mutate(undefined, {
      onSuccess: () => {
        setCode(null)
        generate.reset()
        toast.success('Code cancelled.')
      },
      onError: (error) => toast.error(error.message),
    })

  // a code made earlier (another tab, or before a reload) is still waiting; the API can't show it again
  const waitingElsewhere = !code && pending.data === true
  // known from the session (an older API without /auth/session only says so with a 403 on Get a code)
  const forbidden = session.data?.allowDeviceLogins === false

  return (
    <AccountCard
      icon={<QrCode size={16} />}
      title="Link a mobile device"
      description="Sign in on your phone with the N-Ops app. The phone stays signed in until you remove it here."
    >
      {code ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-text-muted">
            Scan this QR code with the N-Ops app on your phone, or enter your user ID and the code by hand. It works once, for the
            next{' '}
            <span className="font-medium text-text tabular-nums" aria-live="off">
              {formatLeft(code.expiresAt - now)}
            </span>
            .
          </p>
          <div className="flex flex-wrap items-center gap-6">
            {user && (
              // dark on white in both themes, with a quiet zone, so phone cameras read it reliably
              <div className="shrink-0 rounded-lg bg-white p-3" role="img" aria-label="QR code for the N-Ops app">
                <QRCodeSVG
                  value={deviceLinkPayload(env.apiBaseUrl, user.userId, code.token, window.location.origin)}
                  size={176}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-4">
              {user && <CodeValue label="User ID" value={String(user.userId)} />}
              <CodeValue label="Device code" value={code.token} />
            </div>
          </div>
          <p className="text-text-muted" role="status">
            Waiting for the app…
          </p>
          <div>
            <LoadingButton variant="secondary" size="sm" loading={revoke.isPending} onClick={cancel}>
              Cancel code
            </LoadingButton>
          </div>
        </div>
      ) : waitingElsewhere ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-text-muted">
            A code you made earlier is still waiting to be used. For safety it can't be shown again; cancel it to make a new one.
          </p>
          <LoadingButton variant="secondary" size="sm" loading={revoke.isPending} onClick={cancel}>
            Cancel code
          </LoadingButton>
        </div>
      ) : forbidden ? (
        <p className="text-sm text-text-muted">{POLICY_FORBIDS}</p>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-text-muted">You get a one-time code that works for 5 minutes.</p>
            <LoadingButton size="sm" loading={generate.isPending} loadingText="Making code" onClick={makeCode}>
              Get a code
            </LoadingButton>
          </div>
          {generate.error && (
            <p className="text-danger" role="alert">
              {/* with the session allowing it, a 403 is the API's "a code already exists" */}
              {errorStatus(generate.error) === 403 && !session.data?.allowDeviceLogins ? POLICY_FORBIDS : generate.error.message}
            </p>
          )}
          {outcome === 'linked' && (
            <p className="text-signal" role="status">
              Your device is linked. It shows in the list below.
            </p>
          )}
          {outcome === 'failed' && (
            <p className="text-warning" role="status">
              The app tried the code, but no device was linked. A wrong user ID or code uses it up. Get a new one to try again.
            </p>
          )}
          {outcome === 'expired' && (
            <p className="text-text-muted" role="status">
              The code ran out before it was used. Get a new one to try again.
            </p>
          )}
        </div>
      )}
    </AccountCard>
  )
}
