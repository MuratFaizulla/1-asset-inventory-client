// components/asset-detail/AssetHistoryCard.tsx

import type { HistoryItem } from './types'
import { statusLabel, statusBadge, fmtDateTime } from './assetHelpers'

interface Props {
  history:    HistoryItem[]
  onNavigate: (sessionId: number) => void
}

export default function AssetHistoryCard({ history, onNavigate }: Props) {
  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>📅 История инвентаризаций</div>

      {history.length === 0 ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          ОС ещё не участвовал в инвентаризациях
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map(h => (
            <div
              key={h.id}
              style={{
                padding:     '10px 14px',
                background:  'var(--bg3)',
                borderRadius: 6,
                cursor:      'pointer',
                border:      '1px solid var(--border)',
                transition:  'border-color 0.15s',
              }}
              onClick={() => onNavigate(h.session.id)}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
                marginBottom:   4,
              }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{h.session.name}</span>
                <span className={`badge ${statusBadge[h.status] || 'badge-pending'}`}>
                  {statusLabel[h.status] || h.status}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                📍 {h.session.location?.name || h.session.organization?.name || '—'}
                {h.scannedAt && ` · ${fmtDateTime(h.scannedAt)}`}
                {h.scannedBy && ` · ${h.scannedBy}`}
              </div>

              {h.note && (
                <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 4 }}>
                  {h.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}