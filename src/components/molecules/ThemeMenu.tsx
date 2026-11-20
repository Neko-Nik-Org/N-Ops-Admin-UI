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

/** Compact light / dark / system theme dropdown for the Topbar. */

import { useAtomValue, useSetAtom } from 'jotai'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { chooseThemeAtom, themeAtom, type Theme } from '@/app/theme'
import { DropdownMenu, menuItemClass } from '@/components/molecules/DropdownMenu'
import { cn } from '@/utils/cn'

/** Menu entries, in display order. */
const OPTIONS: Array<{ value: Theme; icon: typeof Sun; label: string }> = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
]

/** A button showing the current theme's icon that opens a menu of the three themes. */
export const ThemeMenu = () => {
  const theme = useAtomValue(themeAtom)
  const setTheme = useSetAtom(chooseThemeAtom)
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2]
  const CurrentIcon = current.icon

  return (
    <DropdownMenu label={`Theme: ${current.label}`} menuLabel="Theme" trigger={<CurrentIcon size={15} />} widthClassName="w-36">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="menuitemradio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(menuItemClass, theme === value && 'text-text')}
        >
          <Icon size={14} />
          <span className="flex-1">{label}</span>
          {theme === value && <Check size={14} className="text-signal" />}
        </button>
      ))}
    </DropdownMenu>
  )
}
