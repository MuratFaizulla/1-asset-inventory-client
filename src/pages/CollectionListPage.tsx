import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { API_BASE } from '../api/client'

interface CollectionSession {
  id: number
  name: string
  assetType: string | null
  deadline: string | null
  status: 'OPEN' | 'CLOSED'
  createdAt: string
  createdBy: string | null
  note: string | null
  _count: { items: number }
}

interface AssetNameOption {
  name: string
  count: number
}

export default function CollectionListPage() {
  const [sessions, setSessions]   = useState<CollectionSession[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [exporting, setExporting] = useState<number | null>(null)
  const [cloning, setCloning]     = useState<number | null>(null)

  // Форма
  const [form, setForm] = useState({ name: '', deadline: '', createdBy: '', note: '' })
  const [selectedType, setSelectedType] = useState<string | null>(null) // null = все ОС

  // Выбор наименования ОС
  const [nameOptions, setNameOptions] = useState<AssetNameOption[]>([])
  const [typeSearch, setTypeSearch]   = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    api.get('/collection')
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))

    api.get('/assets/grouped').then(r => {
      // Плоский список наименований, отсортированных по количеству
      setNameOptions(
        (r.data as { name: string; count: number }[])
          .map(g => ({ name: g.name, count: g.count }))
          .sort((a, b) => b.count - a.count)
      )
    }).catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const res = await api.post('/collection', {
        name:      form.name.trim(),
        assetName: selectedType || undefined,
        deadline:  form.deadline ? new Date(form.deadline).toISOString() : undefined,
        createdBy: form.createdBy.trim() || undefined,
        note:      form.note.trim() || undefined,
      })
      setShowModal(false)
      resetModal()
      navigate(`/collection/${res.data.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  const resetModal = () => {
    setForm({ name: '', deadline: '', createdBy: '', note: '' })
    setSelectedType(null)
    setTypeSearch('')
  }

  const handleExport = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setExporting(id)
    const a = document.createElement('a')
    a.href = `${API_BASE}/api/collection/${id}/export`
    a.download = ''
    a.click()
    setTimeout(() => setExporting(null), 1500)
  }

  const handleClone = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Клонировать сессию? Будет создана новая с теми же ОС (все — Не сдал).')) return
    setCloning(id)
    try {
      const res = await api.post(`/collection/${id}/clone`)
      navigate(`/collection/${res.data.id}`)
    } catch {
      alert('Не удалось клонировать')
    } finally {
      setCloning(null)
    }
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  const isOverdue = (s: CollectionSession) =>
    s.status === 'OPEN' && s.deadline && new Date(s.deadline) < new Date()

  const filteredNames = nameOptions.filter(o =>
    !typeSearch || o.name.toLowerCase().includes(typeSearch.toLowerCase())
  )

  const selectedCount = selectedType
    ? nameOptions.find(o => o.name === selectedType)?.count ?? 0
    : nameOptions.reduce((s, o) => s + o.count, 0)

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📥 Сбор ОС</div>
          <div className="page-subtitle">{sessions.length} сессий</div>
        </div>
        <button className="btn btn-primary" onClick={() => { resetModal(); setShowModal(true) }}>
          + Новая сессия
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📥</div>
          <div>Нет сессий сбора</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>
            Создайте сессию чтобы начать принимать ОС от сотрудников
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map(s => {
            const overdue = isOverdue(s)
            return (
              <div
                key={s.id}
                onClick={() => navigate(`/collection/${s.id}`)}
                style={{
                  background: 'var(--bg2)',
                  border: `1px solid ${s.status === 'CLOSED' ? '#2d6a45' : overdue ? '#dc2626' : 'var(--border)'}`,
                  borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{s.name}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: s.status === 'CLOSED' ? '#052e16' : '#1e3a5f',
                        color:      s.status === 'CLOSED' ? '#4ade80' : 'var(--accent)',
                        border:     `1px solid ${s.status === 'CLOSED' ? '#16a34a' : 'var(--accent)'}`,
                      }}>
                        {s.status === 'CLOSED' ? '✅ Закрыта' : '🟢 Открыта'}
                      </span>
                      {s.assetType && (
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>📦 {s.assetType}</span>
                      )}
                      <span style={{ fontSize: 12, color: overdue ? '#f87171' : 'var(--text3)' }}>
                        {overdue ? '⚠️' : '📅'} {fmtDate(s.deadline)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>📋 {s._count.items} ОС</span>
                      {s.createdBy && (
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>👤 {s.createdBy}</span>
                      )}
                    </div>
                    {s.note && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>✏️ {s.note}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <button
                      onClick={e => handleClone(e, s.id)}
                      disabled={cloning === s.id}
                      title="Клонировать сессию"
                      style={{
                        background: 'var(--bg3)', border: '1px solid var(--border)',
                        color: 'var(--text2)', borderRadius: 8, padding: '6px 10px',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        opacity: cloning === s.id ? 0.6 : 1,
                      }}
                    >
                      {cloning === s.id ? '⏳' : '📋'}
                    </button>
                    <button
                      onClick={e => handleExport(e, s.id)}
                      disabled={exporting === s.id}
                      title="Экспорт в Excel"
                      style={{
                        background: 'var(--bg3)', border: '1px solid var(--border)',
                        color: 'var(--text2)', borderRadius: 8, padding: '6px 10px',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        opacity: exporting === s.id ? 0.6 : 1,
                      }}
                    >
                      {exporting === s.id ? '⏳' : '📥'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Модал создания ─────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📥 Новая сессия сбора ОС</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Название */}
              <div>
                <label className="label">Название сессии *</label>
                <input
                  className="input"
                  placeholder='Например: "Сдача ноутбуков май 2026"'
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* Выбор ОС */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="label" style={{ margin: 0 }}>Тип ОС</label>
                  {selectedType && (
                    <button
                      onClick={() => setSelectedType(null)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 11, color: 'var(--text3)', padding: 0,
                      }}
                    >
                      Сбросить выбор
                    </button>
                  )}
                </div>

                {/* Поиск */}
                <input
                  className="input"
                  style={{ marginBottom: 8 }}
                  placeholder="🔍 Поиск..."
                  value={typeSearch}
                  onChange={e => setTypeSearch(e.target.value)}
                />

                {/* Карточки */}
                <div style={{
                  maxHeight: 220, overflowY: 'auto',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  paddingRight: 2,
                }}>
                  {/* "Все ОС" */}
                  <div
                    onClick={() => setSelectedType(null)}
                    style={{
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${selectedType === null ? 'var(--accent)' : 'var(--border)'}`,
                      background: selectedType === null ? '#1e3a5f' : 'var(--bg3)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{
                        fontWeight: 600, fontSize: 13,
                        color: selectedType === null ? 'var(--accent)' : 'var(--text2)',
                      }}>
                        📦 Все наименования
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        Добавит все ОС в базе
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: selectedType === null ? 'var(--accent)' : 'var(--text3)' }}>
                        {nameOptions.reduce((s, o) => s + o.count, 0)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>шт.</div>
                    </div>
                  </div>

                  {/* Наименования ОС */}
                  {filteredNames.map(opt => {
                    const selected = selectedType === opt.name
                    return (
                      <div
                        key={opt.name}
                        onClick={() => setSelectedType(opt.name)}
                        style={{
                          padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                          background: selected ? '#1e3a5f' : 'var(--bg3)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                      >
                        <span style={{
                          fontWeight: selected ? 700 : 400, fontSize: 13,
                          color: selected ? 'var(--accent)' : 'var(--text1)',
                          marginRight: 10,
                        }}>
                          {opt.name}
                        </span>
                        <span style={{
                          fontSize: 12, fontWeight: 700, flexShrink: 0,
                          color: selected ? 'var(--accent)' : 'var(--text3)',
                        }}>
                          {opt.count} шт.
                        </span>
                      </div>
                    )
                  })}

                  {filteredNames.length === 0 && typeSearch && (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
                      Ничего не найдено
                    </div>
                  )}
                </div>

                {/* Итог выбора */}
                <div style={{
                  marginTop: 8, padding: '8px 12px',
                  background: 'var(--bg3)', borderRadius: 8,
                  fontSize: 12, color: 'var(--text2)',
                }}>
                  Будет добавлено:{' '}
                  <strong style={{ color: 'var(--accent)' }}>{selectedCount} ОС</strong>
                  {selectedType && <span style={{ color: 'var(--text3)' }}> · {selectedType}</span>}
                </div>
              </div>

              {/* Дедлайн + Принимает */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">Дедлайн</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Принимает (ФИО)</label>
                  <input
                    className="input"
                    placeholder='Кто принимает'
                    value={form.createdBy}
                    onChange={e => setForm(f => ({ ...f, createdBy: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Примечание</label>
                <input
                  className="input"
                  placeholder='Необязательно'
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Отмена</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
              >
                {creating ? '⏳ Создаю...' : `✅ Создать (${selectedCount} ОС)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
