// components/import/ui/TabBtn.tsx

import type { Tab } from '../import/types'

interface Props {
  t:         Tab
  label:     string
  color:     string
  activeTab: Tab
  count:     number
  onClick:   (t: Tab) => void
}

export default function TabBtn({ t, label, color, activeTab, count, onClick }: Props) {
  const isActive = activeTab === t
  return (
    <button
      onClick={() => onClick(t)}
      style={{
        padding:    '8px 14px',
        borderRadius: 8,
        border:     'none',
        cursor:     'pointer',
        fontSize:   13,
        fontWeight: 600,
        background: isActive ? color + '22' : 'var(--bg3)',
        color:      isActive ? color : 'var(--text2)',
        outline:    isActive ? `1.5px solid ${color}` : 'none',
        transition: 'all .15s',
      }}
    >
      {label}{' '}
      <span style={{ opacity: 0.7, fontWeight: 400 }}>({count})</span>
    </button>
  )
}