import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { API_BASE } from '../api/client'

interface RelocatedItem {
  id: number
  note: string | null
  scannedAt: string | null
  asset: {
    id: number
    inventoryNumber: string
    name: string
    barcode: string | null
    assetType: string
    accountingAccount: string | null
    location: { name: string }
    responsiblePerson: { fullName: string }
    employee: { fullName: string } | null
    organization: { name: string }
  }
}

// Парсим note — может содержать несколько частей через ", "
// Например: "Перемещён в Г-107, Передан сотруднику Иванов И.И., Комментарий: каб. 305"
function parseNote(note: string | null): { location: string | null; employee: string | null; comment: string | null } {
  if (!note) return { location: null, employee: null, comment: null }

  let location: string | null = null
  let employee: string | null = null
  let comment: string | null = null

  // Перемещён в "X" или Перемещён в X
  const locMatch = note.match(/Перемещён в (?:"([^"]+)"|([^,]+))/)
  if (locMatch) location = (locMatch[1] || locMatch[2] || '').trim()

  // Передан сотруднику X
  const empMatch = note.match(/Передан сотруднику ([^,]+)/)
  if (empMatch) employee = empMatch[1].trim()

  // Комментарий: X
  const commentMatch = note.match(/Комментарий:\s*(.+)/)
  if (commentMatch) comment = commentMatch[1].trim()

  // Если ни один паттерн не сработал — показываем всё как есть
  if (!location && !employee && !comment) comment = note

  return { location, employee, comment }
}

export default function RelocationsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState<RelocatedItem[]>([])
  const [sessionName, setSessionName] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [sessionRes, relocRes] = await Promise.all([
          api.get(`/inventory/${id}`),
          api.get(`/inventory/${id}/relocated`)
        ])
        setSessionName(sessionRes.data.name)
        setItems(relocRes.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleExport = (e: React.MouseEvent) => {
    e.preventDefault()
    setExporting(true)
    const a = document.createElement('a')
    a.href = `${API_BASE}/api/inventory/${id}/export-relocated`
    a.download = ''
    a.click()
    setTimeout(() => setExporting(false), 1500)
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline"
            style={{ marginBottom: 8, fontSize: 12, padding: '4px 10px' }}
            onClick={() => navigate(`/inventory/${id}`)}>
            ← Назад к акту
          </button>
          <div className="page-title">📦 Перемещения ОС</div>
          <div className="page-subtitle">{sessionName} · {items.length} записей</div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || items.length === 0}
          style={{
            background: exporting ? 'var(--bg3)' : '#1a3a2a',
            border: '1px solid #2d6a45',
            color: exporting ? 'var(--text3)' : '#4ade80',
            borderRadius: 10, padding: '10px 16px',
            cursor: items.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, minHeight: 44,
          }}
        >
          {exporting ? '⏳' : '📥 Excel для 1С'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📦</div>
          <div>Нет перемещённых ОС</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>
            Перемещения появятся после изменения местонахождения ОС в ходе инвентаризации
          </div>
        </div>
      ) : (
        <>
          {/* Инструкция */}
          <div style={{
            marginBottom: 16, padding: '12px 16px',
            background: '#1e3a5f22', border: '1px solid var(--accent)',
            borderRadius: 12,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}>
              📋 Как обновить в 1С
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              1. Скачайте Excel — кнопка "📥 Excel для 1С"<br />
              2. В 1С откройте каждый ОС по инвентарному номеру<br />
              3. Измените поле "Местонахождение" на значение из колонки "Новое местонахождение"
            </div>
          </div>

          {/* МОБИЛЬ — карточки */}
          <div className="mobile-only" style={{ flexDirection: 'column', gap: 8 }}>
            {items.map(item => {
              const parsed = parseNote(item.note)
              return (
                <div key={item.id} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>
                    {item.asset.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {item.asset.inventoryNumber}
                    </span>
                    {item.asset.barcode && (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                        📊 {item.asset.barcode}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                    📍 По 1С: <span style={{ color: 'var(--text2)' }}>{item.asset.location.name}</span>
                  </div>

                  {/* Новое место */}
                  {parsed.location && (
                    <div style={{
                      background: '#064e3b22', border: '1px solid #064e3b66',
                      borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>ПЕРЕМЕСТИТЬ В →</div>
                      <div style={{ fontWeight: 600, color: 'var(--accent2)', fontSize: 13 }}>
                        📍 {parsed.location}
                      </div>
                    </div>
                  )}

                  {/* Сотрудник */}
                  {parsed.employee && (
                    <div style={{
                      background: '#0c1a2a', border: '1px solid #1e3a5f',
                      borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>ПЕРЕДАН СОТРУДНИКУ →</div>
                      <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>
                        🧑‍💼 {parsed.employee}
                      </div>
                    </div>
                  )}

                  {/* Комментарий */}
                  {parsed.comment && (
                    <div style={{
                      background: '#1a1200', border: '1px solid #451a03',
                      borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>КОММЕНТАРИЙ</div>
                      <div style={{ color: 'var(--warn)', fontSize: 13 }}>
                        ✏️ {parsed.comment}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    👤 {item.asset.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
                    <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                    🕐 {fmtDate(item.scannedAt)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ДЕСКТОП — таблица */}
          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>#</th>
                  <th>Инв. номер</th>
                  <th>Наименование</th>
                  <th>МОЛ</th>
                  <th>По данным 1С</th>
                  <th>Переместить в →</th>
                  <th>Сотрудник</th>
                  <th>Комментарий</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const parsed = parseNote(item.note)
                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}>
                        {idx + 1}
                      </td>
                      <td><span className="mono">{item.asset.inventoryNumber}</span></td>
                      <td style={{ maxWidth: 220, fontSize: 13 }}>{item.asset.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {item.asset.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{item.asset.location.name}</td>
                      <td>
                        {parsed.location
                          ? <span style={{
                              background: '#064e3b33', color: 'var(--accent2)',
                              padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                            }}>📍 {parsed.location}</span>
                          : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td>
                        {parsed.employee
                          ? <span style={{
                              background: '#0c1a2a', color: 'var(--accent)',
                              padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                            }}>🧑‍💼 {parsed.employee}</span>
                          : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--warn)', maxWidth: 160 }}>
                        {parsed.comment || '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(item.scannedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}