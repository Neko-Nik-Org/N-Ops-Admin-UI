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
/** One-time-code boxes for the two-step screen. */

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

/** Props for OtpInput. */
interface OtpInputProps {
  /** Digits typed so far, left to right (no gaps). */
  value: string
  onChange: (value: string) => void
  /** Called once every box is filled. */
  onComplete?: (value: string) => void
  length?: number
  /** Colours the boxes and shakes them on error. */
  state?: 'idle' | 'error' | 'success'
  disabled?: boolean
  autoFocus?: boolean
  /** Accessible name for the group. */
  label?: string
}

/**
 * One box per digit. Typing moves forward, Backspace moves back, arrow keys move between boxes,
 * and pasting a whole code fills every box. Works with SMS/autofill one-time codes.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  state = 'idle',
  disabled,
  autoFocus = true,
  label = 'Verification code',
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus()

  useEffect(() => {
    if (autoFocus) focus(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus])

  useEffect(() => {
    if (state === 'error' && value === '') focus(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, value])

  const commit = (next: string, focusAt: number) => {
    const v = next.replace(/\D/g, '').slice(0, length)
    onChange(v)
    focus(focusAt)
    if (v.length === length) onComplete?.(v)
  }

  const onInput = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    if (digits.length > 1) {
      // autofill or a fast typist: treat as a paste from this box onward
      const at = Math.min(i, value.length)
      commit(value.slice(0, at) + digits, at + digits.length)
      return
    }
    if (i >= value.length) commit(value + digits, value.length + 1)
    else commit(value.slice(0, i) + digits + value.slice(i + 1), i + 1)
  }

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[i] !== undefined) commit(value.slice(0, i) + value.slice(i + 1), i)
      else if (i > 0) commit(value.slice(0, i - 1) + value.slice(i), i - 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focus(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focus(Math.min(i + 1, value.length))
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!digits) return
    e.preventDefault()
    commit(digits, digits.length)
  }

  const half = Math.ceil(length / 2)
  return (
    <div className="n-otp" role="group" aria-label={label} data-state={state}>
      {Array.from({ length }, (_, i) => (
        <span key={i} className="n-otp__cell" data-gap={i === half ? '' : undefined}>
          <input
            ref={(el) => {
              refs.current[i] = el
            }}
            value={value[i] ?? ''}
            onChange={(e) => onInput(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={length}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${length}`}
            data-filled={value[i] !== undefined ? '' : undefined}
          />
        </span>
      ))}
    </div>
  )
}
