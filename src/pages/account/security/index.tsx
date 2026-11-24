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
/** Account › Security (/account/security): password and deactivation, and what the user's role lets them do. */

import { PageHeader } from '@/components/PageHeader'
import { AccessCard } from '@/pages/account/AccessCard'
import { AccountSecurityCard } from '@/pages/account/AccountSecurityCard'

export const AccountSecurityPage = () => (
  <div className="flex flex-col gap-4">
    <PageHeader title="Security" />
    <AccountSecurityCard />
    <AccessCard />
  </div>
)
