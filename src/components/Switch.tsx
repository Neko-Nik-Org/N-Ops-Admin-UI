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
/** On/off switch atom. */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

/** Checkbox props plus a label and optional help text. */
interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: ReactNode
}

/**
 * A native checkbox drawn as a switch (role="switch"), so it works with react-hook-form's
 * `register` and the keyboard (Space) like any checkbox.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({ label, description, className, ...props }, ref) => (
  <label className={cn('flex cursor-pointer items-start justify-between gap-4', className)}>
    <span className="flex flex-col gap-0.5">
      <span className="text-sm text-text">{label}</span>
      {description && <span className="text-xs text-text-muted">{description}</span>}
    </span>
    <input
      ref={ref}
      type="checkbox"
      role="switch"
      className={cn(
        'relative mt-0.5 h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-border-strong bg-border transition-colors duration-150',
        'before:absolute before:top-0.5 before:left-0.5 before:size-3.5 before:rounded-full before:bg-surface before:shadow before:transition-transform before:duration-150',
        'checked:border-signal checked:bg-signal checked:before:translate-x-4 disabled:cursor-default disabled:opacity-60',
      )}
      {...props}
    />
  </label>
))

Switch.displayName = 'Switch'
