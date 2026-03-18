// components/import/ImportDoneStep.tsx

import type { ApplyResult } from './types'

interface Props {
  result:  ApplyResult
  onReset: () => void
}

export default function ImportDoneStep({ result, onReset }: Props) {
  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{
        padding:      20,
        background:   '#064e3b22',
        border:       '1px solid var(--accent2)',
        borderRadius: 12,
        marginBottom: 16,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 16, color: 'var(--accent2)', fontSize: 15 }}>
          ✅ Импорт завершён
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { label: '🆕 Добавлено',    value: result.created,             color: '#4ade80'      },
            { label: '✏️ Обновлено',     value: result.updated,             color: '#facc15'      },
            { label: '➖ Без изменений', value: result.unchanged,           color: 'var(--text3)' },
            { label: '⚠️ Ошибок',        value: result.errors?.length || 0, color: '#f87171'      },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg3)', padding: '12px 16px', borderRadius: 8 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'IBM Plex Mono' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {result.errors?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: '#f87171', marginBottom: 6, fontWeight: 500 }}>
              Ошибки при импорте:
            </div>
            <div style={{
              maxHeight:  140,
              overflowY:  'auto',
              fontSize:   11,
              color:      'var(--text3)',
              background: 'var(--bg3)',
              borderRadius: 6,
              padding:    '6px 10px',
            }}>
              {result.errors.map((e, i) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="mono" style={{ color: '#f87171' }}>{e.inv}</span>
                  <span style={{ marginLeft: 8 }}>{e.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button className="btn btn-outline" onClick={onReset}>
        ← Загрузить ещё один файл
      </button>
    </div>
  )
}