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
 * Where a project folder's toolbar goes: the right end of the project's tab row (Env, Conf, Notes).
 * ProjectView provides the element; SectionToolbar renders into it with a portal.
 */

import { createContext } from 'react'

/** The tab row's toolbar slot, or null outside a project (the toolbar then renders in place). */
export const SectionToolbarSlot = createContext<HTMLElement | null>(null)
