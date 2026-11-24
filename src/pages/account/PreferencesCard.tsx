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
/** Theme and other per-account settings, saved to the account so they follow the user to other devices. */

import { SlidersHorizontal } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccountCard } from '@/pages/account/AccountCard'

export const PreferencesCard = ({ className }: { className?: string }) => (
  <AccountCard
    icon={<SlidersHorizontal size={16} />}
    title="Preferences"
    description="Saved to your account, so they follow you to other devices."
    className={className}
  >
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-text">Theme</span>
      <ThemeToggle />
    </div>
  </AccountCard>
)
