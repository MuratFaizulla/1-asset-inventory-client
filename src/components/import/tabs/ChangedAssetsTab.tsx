// components/import/tabs/ChangedAssetsTab.tsx

import type { ChangedAsset } from '../import/types'
import SearchInput from '../ui/SearchInput'

interface Props {
  items:       ChangedAsset[]
  total:       number
  search:      string
  onSearch:    (v: string) => void
  expandedIds: Set<number>
  onToggle:    (id: number) => void
  onToggleAll: () => void
}

export default function ChangedAssetsTab({
  items, total, search, onSearch,
  expandedIds, onToggle, onToggleAll,
}: Props) {
  if (items.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
        {search ? 'Ничего не найдено' : 'Нет изменённых ОС'}
      </div>
    )
  }

  return (
    <>
      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder="Поиск по названию, номеру, кабинету, полю изменения..."
      />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding:      '8px 12px',
          background:   'var(--bg3)',
          fontSize:     11,
          color:        'var(--text3)',
          borderBottom: '1px solid var(--border)',
          display:      'flex',
          justifyContent: 'space-between',
          alignItems:   'center',
        }}>
          <span>Показано: {items.length} из {total}</span>
          <button
            onClick={onToggleAll}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', fontSize: 11,
            }}
          >
            {expandedIds.size === items.length ? 'Свернуть все' : 'Развернуть все'}
          </button>
        </div>

        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {items.map(a => {
            const isExpanded = expandedIds.has(a.id)
            return (
              <div
                key={a.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  transition:   'background .1s',
                }}
              >
                {/* Строка заголовка */}
                <div
                  onClick={() => onToggle(a.id)}
                  style={{
                    padding:        '10px 16px',
                    cursor:         'pointer',
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                    gap:            8,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                      {a.inventoryNumber}
                    </span>
                    {a.employee && (
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                        👤 {a.employee}
                      </span>
                    )}
                    {!isExpanded && (
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                        📍 {a.location}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, color: '#facc15',
                      background: '#facc1522', borderRadius: 4,
                      padding: '2px 6px', fontWeight: 600,
                    }}>
                      {a.changes.length} изм.
                    </span>
                    <span style={{ color: 'var(--text3)', fontSize: 12 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Раскрытые изменения */}
                {isExpanded && (
                  <div style={{
                    padding:     '0 16px 12px',
                    background:  'var(--bg3)',
                    borderTop:   '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', padding: '8px 0 6px' }}>
                      📍 {a.location} · МОЛ: {a.mol}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {a.changes.map((c, j) => (
                        <div key={j} style={{
                          display:               'grid',
                          gridTemplateColumns:   '130px 1fr auto 1fr',
                          gap:                   8,
                          alignItems:            'center',
                          fontSize:              12,
                        }}>
                          <span style={{
                            color:        'var(--text3)',
                            fontSize:     11,
                            background:   'var(--bg2)',
                            borderRadius: 4,
                            padding:      '2px 6px',
                            textAlign:    'center',
                          }}>
                            {c.field}
                          </span>
                          <span style={{
                            color:          '#f87171',
                            textDecoration: 'line-through',
                            overflow:       'hidden',
                            textOverflow:   'ellipsis',
                            whiteSpace:     'nowrap',
                          }}>
                            {String(c.oldVal) || '—'}
                          </span>
                          <span style={{ color: 'var(--text3)' }}>→</span>
                          <span style={{
                            color:        '#4ade80',
                            overflow:     'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace:   'nowrap',
                          }}>
                            {String(c.newVal) || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}