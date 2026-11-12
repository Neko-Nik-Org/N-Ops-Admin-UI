import { useEffect, useState } from 'react';
import { cx } from './NLogo';

/** Thin accent bar along the top of the window while a page or route loads. */
export function TopProgress({ active, label = 'Loading page' }: { active: boolean; label?: string }) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>(active ? 'running' : 'idle');

  useEffect(() => {
    if (active) {
      setPhase('running');
      return;
    }
    setPhase((p) => (p === 'running' ? 'done' : p));
    const t = setTimeout(() => setPhase((p) => (p === 'done' ? 'idle' : p)), 600);
    return () => clearTimeout(t);
  }, [active]);

  if (phase === 'idle') return null;
  return (
    <div className={cx('n-top', phase === 'done' && 'is-done')} role="progressbar" aria-label={label} aria-busy={phase === 'running'}>
      <span />
    </div>
  );
}
