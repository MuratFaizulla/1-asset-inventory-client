import type { HistoryEntry } from './types'

interface Props {
  history:      HistoryEntry[]
  onBack:       () => void
  onClear:      () => void
}

const statusColor = (s: string) => {
  if (s === 'FOUND')     return 'var(--accent2)'
  if (s === 'MISPLACED') return 'var(--warn)'
  if (s === 'ALREADY')   return '#60a5fa'
  return 'var(--danger)'
}

const statusEmoji = (s: string) => {
  if (s === 'FOUND')     return '✅'
  if (s === 'MISPLACED') return '⚠️'
  if (s === 'ALREADY')   return '🔄'
  return '❌'
}

export default function HistoryScreen({ history, onBack, onClear }: Props) {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }}
          onClick={onBack}>← Назад</button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <div className="page-title">История сканирования</div>
          <div className="page-subtitle">{history.length} записей</div>
        </div>
        {history.length > 0 && (
          <button className="btn btn-outline"
            style={{ fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={onClear}>
            Очистить
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
          История пуста
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map(h => (
            <div key={h.id} style={{
              background:   'var(--bg2)',
              borderRadius: 10,
              border:       '1px solid var(--border)',
              borderLeft:   `3px solid ${statusColor(h.status)}`,
              padding:      '12px 14px',
              display:      'flex',
              alignItems:   'center',
              gap:          10,
            }}>
              <span style={{ fontSize: 20 }}>{statusEmoji(h.status)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize:     13,
                  fontWeight:   500,
                  color:        'var(--text1)',
                  whiteSpace:   'nowrap',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {h.name}
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {h.barcode}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                {h.time}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}