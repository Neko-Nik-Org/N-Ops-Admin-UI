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

/** React Query hook for an invite's details. */

import { useQuery } from '@tanstack/react-query'
import { getInviteDetails } from '../api/invite'

/** Loads the invite for `token`. No retries: an invalid or expired invite should show its error immediately. */
export const useInviteDetails = (token: string) =>
  useQuery({ queryKey: ['invite', token], queryFn: () => getInviteDetails(token), retry: false })
