// components/assets/AssetsMobileList.tsx

import type { Asset, Meta } from './types'

interface Props {
  assets:   Asset[]
  meta:     Meta
  onSelect: (id: number) => void
}

export default function AssetsMobileList({ assets, meta, onSelect }: Props) {
  return (
    <div className="mobile-only" style={{ flexDirection: 'column', gap: 8 }}>
      {assets.map((a, i) => (
        <div
          key={a.id}
          onClick={() => onSelect(a.id)}
          style={{
            background:               'var(--bg2)',
            border:                   '1px solid var(--border)',
            borderRadius:             12,
            padding:                  '12px 14px',
            cursor:                   'pointer',
            WebkitTapHighlightColor:  'transparent',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>
                {a.name}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {a.inventoryNumber}
                </span>
                {a.barcode && (
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                    📊 {a.barcode}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>📍 {a.location.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                {a.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
                {a.employee && ` · ${a.employee.fullName.split(' ')[0]}`}
              </div>
            </div>
            <div style={{
              fontFamily: 'IBM Plex Mono',
              fontSize:   12,
              color:      'var(--text3)',
              flexShrink: 0,
              paddingTop: 2,
            }}>
              #{(meta.page - 1) * 200 + i + 1}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}