// components/asset-detail/AssetFinanceCard.tsx

import type { Asset } from './types'
import { fmt, deprColor } from './assetHelpers'

interface Props {
  asset: Asset
}

export default function AssetFinanceCard({ asset }: Props) {
  const color = deprColor(asset.depreciationPercent)

  const stats = [
    { label: 'Стоимость БУ',         value: fmt(asset.bookValue),     color: 'var(--text)'    },
    { label: 'Остаточная стоимость',  value: fmt(asset.residualValue), color: 'var(--accent2)' },
    { label: 'Срок износа',
      value: asset.depreciationMonths ? `${asset.depreciationMonths} мес.` : '—',
      color: 'var(--text2)',
    },
  ]

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>💰 Стоимость и износ</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        {stats.map(f => (
          <div key={f.label} style={{
            padding:    '12px',
            background: 'var(--bg3)',
            borderRadius: 6,
            textAlign:  'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{f.label}</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 600, color: f.color }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>

      {asset.depreciationPercent != null && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--text2)' }}>Износ</span>
            <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 600, color }}>
              {asset.depreciationPercent.toFixed(1)}%
              {asset.depreciationEndYear && ` · до ${asset.depreciationEndYear}`}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height:     '100%',
              borderRadius: 4,
              background: color,
              width:      `${Math.min(asset.depreciationPercent, 100)}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </>
      )}
    </div>
  )
}