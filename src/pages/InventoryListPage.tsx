import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { API_BASE } from '../api/client'

interface Session {
  id: number
  name: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  startedAt: string
  finishedAt: string | null
  createdBy: string | null
  location: { name: string } | null
  organization: { name: string } | null
  _count: { items: number }
}

interface Location {
  id: number
  name: string
}

interface Organization {
  id: number
  name: string
}

export default function InventoryListPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [showModal, setShowModal] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [faTypes, setFaTypes] = useState<string[]>([])
  const [selectedFaTypes, setSelectedFaTypes] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', locationId: '', organizationId: '', createdBy: '' })
  const [creating, setCreating] = useState(false)
  const [exporting, setExporting] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/inventory').then(r => setSessions(r.data)).catch(() => {})
    api.get('/locations').then(r => setLocations(r.data))
    api.get('/locations/organizations').then(r => setOrgs(r.data))
    api.get('/assets/grouped').then(r => setFaTypes(r.data.map((g: { name: string }) => g.name))).catch(() => {})
  }, [])

  const toggleFaType = (t: string) => {
    setSelectedFaTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const res = await api.post('/inventory', {
        name: form.name,
        locationId: form.locationId || undefined,
        organizationId: form.organizationId || undefined,
        assetNames: selectedFaTypes.length > 0 ? selectedFaTypes : undefined,
        createdBy: form.createdBy || undefined,
      })
      setShowModal(false)
      setForm({ name: '', locationId: '', organizationId: '', createdBy: '' })
      setSelectedFaTypes([])
      navigate(`/inventory/${res.data.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  const handleExport = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation()
    setExporting(sessionId)
    try {
      const url = `${API_BASE}/api/inventory/${sessionId}/export`
      const a = document.createElement('a')
      a.href = url
      a.download = ''
      a.click()
    } finally {
      setTimeout(() => setExporting(null), 1500)
    }
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  const statusConfig = {
    IN_PROGRESS: { label: 'В процессе', color: '#3b82f6', bg: '#1d3a6a', icon: '🔵' },
    COMPLETED:   { label: 'Завершён',   color: 'var(--accent2)', bg: '#064e3b55', icon: '✅' },
    CANCELLED:   { label: 'Отменён',    color: 'var(--danger)', bg: '#4c0519', icon: '❌' },
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Инвентаризация</div>
          <div className="page-subtitle">{sessions.length} актов</div>
        </div>
        <button className="btn btn-primary" style={{ minHeight: 44 }} onClick={() => setShowModal(true)}>
          + Новый акт
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <div>Нет актов инвентаризации</div>
          <div style={{ fontSize: 13, marginTop: 8, color: 'var(--text3)' }}>
            Создайте первый акт и начните сканировать
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20, minHeight: 48, padding: '0 32px' }}
            onClick={() => setShowModal(true)}>
            + Создать первый акт
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map(s => {
            const cfg = statusConfig[s.status]
            const isActive = s.status === 'IN_PROGRESS'

            return (
              <div
                key={s.id}
                onClick={() => navigate(`/inventory/${s.id}`)}
                style={{
                  background: 'var(--bg2)',
                  border: `1.5px solid ${isActive ? '#3b82f6' : 'var(--border)'}`,
                  borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Шапка */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, flex: 1, paddingRight: 10, lineHeight: 1.3 }}>
                    {s.name}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {cfg.icon} {cfg.label}
                  </div>
                </div>

                {/* Дата + место */}
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
                  🗓 {fmtDate(s.startedAt)}
                  {s.finishedAt && (
                    <span style={{ color: 'var(--accent2)', marginLeft: 6 }}>
                      → {fmtDate(s.finishedAt)}
                    </span>
                  )}
                  <br />
                  <span style={{ fontSize: 12 }}>
                    📍 {s.location?.name || s.organization?.name || 'Вся организация'}
                    {s.createdBy && (
                      <><span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>{s.createdBy.split(' ').slice(0, 2).join(' ')}</>
                    )}
                  </span>
                </div>

                {/* Действия */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    flex: 1, background: isActive ? '#1d3a6a' : 'var(--bg3)',
                    color: isActive ? '#60a5fa' : 'var(--text2)',
                    borderRadius: 10, padding: '10px 14px',
                    textAlign: 'center', fontWeight: 600, fontSize: 13,
                  }}>
                    {isActive ? '📷 Продолжить' : '👁 Открыть'}
                  </div>

                  {/* Счётчик ОС */}
                  <div style={{
                    background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px',
                    textAlign: 'center', minWidth: 52,
                  }}>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>
                      {s._count.items}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>ОС</div>
                  </div>

                  {/* Кнопка Excel */}
                  <button
                    onClick={e => handleExport(e, s.id)}
                    disabled={exporting === s.id}
                    style={{
                      background: exporting === s.id ? 'var(--bg3)' : '#1a3a2a',
                      border: '1px solid #2d6a45',
                      color: exporting === s.id ? 'var(--text3)' : '#4ade80',
                      borderRadius: 10, padding: '10px 14px',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      whiteSpace: 'nowrap', minWidth: 52,
                    }}
                  >
                    {exporting === s.id ? '⏳' : '📥 Excel'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Модалка */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480 }}>
            <div className="modal-title">Новый акт инвентаризации</div>

            {[
              { label: 'Название акта *', key: 'name', placeholder: 'напр. Инвентаризация март 2025' },
              { label: 'Кто проводит', key: 'createdBy', placeholder: 'ФИО ответственного' },
            ].map(f => (
              <div className="form-group" key={f.key}>
                <label className="form-label">{f.label}</label>
                <input
                  className="input" style={{ width: '100%', minHeight: 44 }}
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="form-group">
              <label className="form-label">Помещение</label>
              <select className="input" style={{ width: '100%', minHeight: 44 }} value={form.locationId}
                onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}>
                <option value="">Все помещения</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Организация</label>
              <select className="input" style={{ width: '100%', minHeight: 44 }} value={form.organizationId}
                onChange={e => setForm(f => ({ ...f, organizationId: e.target.value }))}>
                <option value="">Все организации</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Наименование ОС</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>
                  {selectedFaTypes.length === 0
                    ? 'все наименования'
                    : `выбрано: ${selectedFaTypes.length}`}
                </span>
              </label>
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 10,
                maxHeight: 200,
                overflowY: 'auto',
                background: 'var(--bg3)',
              }}>
                {faTypes.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text3)' }}>
                    Загрузка...
                  </div>
                ) : (
                  faTypes.map(t => {
                    const checked = selectedFaTypes.includes(t)
                    return (
                      <label
                        key={t}
                        onClick={() => toggleFaType(t)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 14px', cursor: 'pointer',
                          background: checked ? '#1d3a6a' : 'transparent',
                          borderBottom: '1px solid var(--border)',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${checked ? '#3b82f6' : 'var(--border)'}`,
                          background: checked ? '#3b82f6' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {checked && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: 13, color: checked ? '#93c5fd' : 'var(--text)' }}>{t}</span>
                      </label>
                    )
                  })
                )}
              </div>
              {selectedFaTypes.length > 0 && (
                <button
                  onClick={() => setSelectedFaTypes([])}
                  style={{
                    marginTop: 6, fontSize: 12, color: 'var(--text3)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  Сбросить выбор
                </button>
              )}
            </div>

            <div className="modal-actions" style={{ gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, minHeight: 48 }}
                onClick={() => setShowModal(false)}>Отмена</button>
              <button className="btn btn-primary" style={{ flex: 2, minHeight: 48, fontSize: 15 }}
                onClick={handleCreate} disabled={!form.name.trim() || creating}>
                {creating ? 'Создаём...' : '✅ Создать акт'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
