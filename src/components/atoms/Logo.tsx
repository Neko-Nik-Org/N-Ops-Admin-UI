import { NLogo } from '@/components/loading'
import { cn } from '@/utils/cn'

export const Logo = ({ className, iconSize = 32 }: { className?: string; iconSize?: number }) => (
  <span className={cn('inline-flex items-center gap-2.5 text-lg font-semibold text-text', className)}>
    <NLogo size={iconSize} />
    N-Ops
  </span>
)
