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
/** Copy-to-clipboard button molecule. */

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { LoadingButton } from '@/components/loading'

/** Icon button that copies `text` (or the result of `getText`) and briefly shows a check mark. */
export const CopyButton = ({
  text,
  getText,
  label = 'Copy',
}: {
  text?: string
  getText?: () => Promise<string>
  label?: string
}) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text ?? (await getText!()))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy. Select the text and copy it by hand.")
    }
  }

  return (
    <LoadingButton
      variant="ghost"
      size="sm"
      icon={copied ? <Check size={14} className="text-signal" /> : <Copy size={14} />}
      aria-label={copied ? 'Copied' : label}
      title={label}
      onClick={copy}
    />
  )
}
