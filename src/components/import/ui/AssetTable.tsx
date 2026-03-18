// components/import/ui/AssetTable.tsx

import type { NewAsset, UnchangedAsset } from '../import/types'

interface Props {
  items:     (NewAsset | UnchangedAsset)[]
  emptyText: string
}

export default function AssetTable({ items, emptyText }: Props) {
  if (items.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
        {emptyText}
      </div>
    )
  }

  return (
    <>
      {/* Mobile */}
      <div className="mobile-only" style={{ flexDirection: 'column', maxHeight: 460, overflowY: 'auto' }}>
        {items.map((a, i) => (
          <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                {a.inventoryNumber}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>📍 {a.location}</span>
              {a.employee && (
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>👤 {a.employee}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="desktop-only" style={{ maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: 'var(--bg3)', position: 'sticky', top: 0 }}>
            <tr>
              {['ИНВ. НОМЕР', 'НАИМЕНОВАНИЕ', 'КАБИНЕТ', 'МОЛ', 'СОТРУДНИК'].map(h => (
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
            {items.map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}>
                  <span className="mono" style={{ fontSize: 12 }}>{a.inventoryNumber}</span>
                </td>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{a.name}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>{a.location}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>
                  {a.mol.split(' ').slice(0, 2).join(' ')}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>
                  {a.employee || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}