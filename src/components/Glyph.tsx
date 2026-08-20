import type { AppId } from '../system/types'

const common = {
  width: 34,
  height: 34,
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function Glyph({ id }: { id: AppId }) {
  if (id === 'lux') return <svg {...common}><path d="M13 9v30h25" /><path d="M13 39h25" /></svg>
  if (id === 'gallery') return <svg {...common}><rect x="8" y="9" width="32" height="30" rx="7" /><circle cx="18" cy="19" r="3" /><path d="m11 35 9-9 6 6 4-4 7 7" /></svg>
  if (id === 'notes') return <svg {...common}><rect x="10" y="7" width="28" height="34" rx="6" /><path d="M16 17h16M16 24h16M16 31h10" /></svg>
  if (id === 'projects') return <svg {...common}><path d="M8 15h13l4 5h15v17H8z" /><path d="M8 15V11h12l4 4" /></svg>
  if (id === 'files') return <svg {...common}><path d="M9 13h13l4 5h13v20H9z" /><path d="M9 22h30" /></svg>
  if (id === 'browser') return <svg {...common}><circle cx="24" cy="24" r="16" /><path d="M8 24h32M24 8c5 5 7 10 7 16s-2 11-7 16M24 8c-5 5-7 10-7 16s2 11 7 16" /></svg>
  if (id === 'themes') return <svg {...common}><circle cx="24" cy="24" r="15" /><circle cx="18" cy="18" r="2" fill="currentColor" stroke="none" /><circle cx="28" cy="16" r="2" fill="currentColor" stroke="none" /><circle cx="32" cy="25" r="2" fill="currentColor" stroke="none" /><path d="M25 39c-3-2-4-5-2-8 2-3 6-2 9-1 4 1 7-2 7-6" /></svg>
  if (id === 'terminal') return <svg {...common}><rect x="7" y="9" width="34" height="30" rx="7" /><path d="m14 18 6 6-6 6M25 31h9" /></svg>
  return <svg {...common}><circle cx="24" cy="24" r="6" /><path d="M24 8v5M24 35v5M8 24h5M35 24h5M12.7 12.7l3.5 3.5M31.8 31.8l3.5 3.5M35.3 12.7l-3.5 3.5M16.2 31.8l-3.5 3.5" /></svg>
}
