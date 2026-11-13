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

/** Light / dark / system theme switch. */

import { useAtom } from 'jotai'
import { Monitor, Moon, Sun } from 'lucide-react'
import { themeAtom, type Theme } from '@/app/theme'
import { cn } from '@/utils/cn'

/** The three theme buttons, in display order. */
const OPTIONS: Array<{ value: Theme; icon: typeof Sun; label: string }> = [
  { value: 'light', icon: Sun, label: 'Light theme' },
  { value: 'dark', icon: Moon, label: 'Dark theme' },
  { value: 'system', icon: Monitor, label: 'Match system theme' },
]

/** Segmented control that sets the theme; the choice is saved and synced to the account. */
export const ThemeToggle = () => {
  const [theme, setTheme] = useAtom(themeAtom)

  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-raised p-0.5">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex size-7 items-center justify-center rounded transition-colors duration-150',
            theme === value ? 'bg-signal text-ink' : 'text-text-muted hover:text-text',
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
