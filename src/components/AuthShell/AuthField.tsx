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
/** Labelled input for the sign-in screens. */

import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

/** Native input props plus label, icon, error and a slot on the label row. */
interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  /** Icon inside the box, on the left. */
  icon?: ReactNode
  /** Shown under the box in red and announced to screen readers. */
  error?: string
  /** Right side of the label row, e.g. a "Forgot password?" link. */
  aside?: ReactNode
  /** Help text under the box, hidden while there is an error. */
  hint?: ReactNode
}

/** Input with an icon, an error line and a show/hide button for passwords. Forwards its ref for react-hook-form. */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, icon, error, aside, hint, id, type = 'text', className, ...rest }, ref) => {
    const autoId = useId()
    const fid = id ?? autoId
    const eid = `${fid}-error`
    const [show, setShow] = useState(false)
    const isPassword = type === 'password'

    return (
      <div className={cn('n-auth-field', className)}>
        <div className="n-auth-label">
          <label htmlFor={fid}>{label}</label>
          {aside}
        </div>
        <div className="n-auth-input" data-invalid={error ? '' : undefined}>
          {icon && (
            <span className="n-auth-input__icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={fid}
            type={isPassword && show ? 'text' : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? eid : undefined}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              className="n-auth-eye"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error ? (
          <p id={eid} className="n-auth-error" role="alert">
            <CircleAlert size={15} />
            {error}
          </p>
        ) : (
          hint && <p className="n-auth-hint">{hint}</p>
        )}
      </div>
    )
  },
)

AuthField.displayName = 'AuthField'

/** Red banner at the top of a form for errors from the server. Shakes when it appears. */
export const AuthBanner = ({ children }: { children: ReactNode }) => (
  <div className="n-auth-banner" role="alert">
    <CircleAlert size={18} />
    {children}
  </div>
)
