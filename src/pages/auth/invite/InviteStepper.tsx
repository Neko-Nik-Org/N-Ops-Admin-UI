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

/** Step indicator for the invite form: numbered dots joined by a line, done steps ticked. */

import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface StepperStep {
  /** Short name under the dot. */
  label: string
  optional?: boolean
}

/**
 * Shows where the user is. Steps before the current one can be clicked to go back to them; later
 * ones can't be skipped to (each step is checked before moving on).
 */
export const InviteStepper = ({
  steps,
  current,
  onSelect,
}: {
  steps: readonly StepperStep[]
  current: number
  onSelect: (index: number) => void
}) => (
  <nav aria-label="Steps" className="mb-5">
    <ol className="flex items-start">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={step.label} className="relative flex flex-1 flex-col items-center gap-1.5">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn('absolute top-3.5 right-1/2 h-0.5 w-full', i <= current ? 'bg-signal' : 'bg-border')}
              />
            )}
            <button
              type="button"
              disabled={!done}
              onClick={() => onSelect(i)}
              aria-current={active ? 'step' : undefined}
              aria-label={`Step ${i + 1}: ${step.label}${done ? ' (done)' : ''}${step.optional ? ', optional' : ''}`}
              className={cn(
                'relative z-10 flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                done && 'cursor-pointer border-signal bg-signal text-ink hover:opacity-90',
                active && 'border-signal bg-signal/15 text-signal ring-4 ring-signal/15',
                !done && !active && 'border-border bg-ink text-text-muted',
              )}
            >
              {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : i + 1}
            </button>
            <span className={cn('text-center text-[0.6875rem] leading-tight', active ? 'text-text' : 'text-text-muted')}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  </nav>
)
