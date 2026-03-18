// components/import/tabs/OrphanedTab.tsx

import type { OrphanedAsset } from '../import/types'
import Spinner     from '../ui/Spinner'
import SearchInput from '../ui/SearchInput'

interface Props {
  items:        OrphanedAsset[]
  total:        number
  search:       string
  onSearch:     (v: string) => void
  selected:     Set<number>
  onToggle:     (id: number) => void
  onSelectAll:  () => void
  onDelete:     () => void
  deleting:     boolean
  deletedCount: number | null
}

export default function OrphanedTab({
  items, total, search, onSearch,
  selected, onToggle, onSelectAll, onDelete,
  deleting, deletedCount,
}: Props) {
  if (items.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
        {deletedCount !== null ? `✅ Удалено ${deletedCount} ОС` : 'Лишних ОС нет'}
      </div>
    )
  }

  const allSelected = selected.size === items.length

  return (
    <>
      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder="Поиск по названию, номеру, кабинету, МОЛ..."
      />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Панель действий */}
        <div style={{
          padding:        '10px 16px',
          borderBottom:   '1px solid var(--border)',
          display:        'flex',
          gap:            8,
          flexWrap:       'wrap',
          alignItems:     'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>
            Выбрано: <strong>{selected.size}</strong> из {total}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={onSelectAll}>
              {allSelected ? 'Снять всё' : 'Выбрать всё'}
            </button>
            <button
              className="btn btn-danger"
              style={{ fontSize: 12 }}
              onClick={onDelete}
              disabled={selected.size === 0 || deleting}
            >
              {deleting
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Spinner size={12} /> Удаляем...
                  </span>
                : `🗑️ Удалить (${selected.size})`
              }
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="mobile-only" style={{ flexDirection: 'column', maxHeight: 400, overflowY: 'auto' }}>
          {items.map(o => (
            <div
              key={o.id}
              onClick={() => onToggle(o.id)}
              style={{
                padding:      '10px 14px',
                borderBottom: '1px solid var(--border)',
                background:   selected.has(o.id) ? '#450a0a20' : undefined,
                cursor:       'pointer',
                display:      'flex',
                gap:          10,
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                onChange={() => {}}
                onClick={e => e.stopPropagation()}
                style={{ marginTop: 3, accentColor: 'var(--danger)', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{o.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {o.inventoryNumber} · {o.location}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="desktop-only" style={{ maxHeight: 380, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--bg3)', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '8px 12px', width: 40 }} />
                {['ИНВ. НОМЕР', 'НАИМЕНОВАНИЕ', 'КАБИНЕТ', 'МОЛ'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    color: 'var(--text3)', fontSize: 11, fontWeight: 500,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(o => (
                <tr
                  key={o.id}
                  onClick={() => onToggle(o.id)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor:       'pointer',
                    background:   selected.has(o.id) ? '#450a0a15' : undefined,
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => {}}
                      onClick={e => e.stopPropagation()}
                      style={{ accentColor: 'var(--danger)' }}
                    />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="mono" style={{ fontSize: 12 }}>{o.inventoryNumber}</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{o.name}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>{o.location}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>
                    {o.mol.split(' ').slice(0, 2).join(' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}