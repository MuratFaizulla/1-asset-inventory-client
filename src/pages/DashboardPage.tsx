import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

interface Stats {
  summary: {
    totalAssets: number
    totalLocations: number
    totalSessions: number
    completedSessions: number
    inProgressSessions: number
  }
  depreciation: { good: number; medium: number; high: number; full: number; unknown: number }
  locationStats: Array<{ name: string; count: number }>
  recentSessions: Array<{
    id: number; name: string; status: string; startedAt: string
    finishedAt: string | null; location: string
    total: number; found: number; notFound: number; misplaced: number; pending: number
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Загрузка...</div>
  if (!stats) return null

  const { summary, depreciation, locationStats, recentSessions } = stats
  const maxCount = Math.max(...locationStats.map(l => l.count), 1)
  const deprTotal = Object.values(depreciation).reduce((a, b) => a + b, 0)

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })

  const sessionProgress = (s: Stats['recentSessions'][0]) => {
    const checked = s.found + s.notFound + s.misplaced
    return s.total > 0 ? Math.round((checked / s.total) * 100) : 0
  }

  const inventoryRate = summary.totalSessions > 0
    ? Math.round(summary.completedSessions / summary.totalSessions * 100)
    : 0

  return (
    <div>
      <style>{`
        .dash-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 768px) { .dash-grid-2 { grid-template-columns: 1fr; } }
        .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
        @media (max-width: 768px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
        .quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
        @media (max-width: 768px) { .quick-actions { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Дашборд</div>
        <div className="page-subtitle">НИШ Туркестан — обзор основных средств</div>
      </div>

      {/* Главные цифры */}
      <div className="summary-grid">
        {[
          { label: 'Всего ОС', value: summary.totalAssets.toLocaleString(), icon: '📦', color: 'var(--accent)', onClick: () => navigate('/assets') },
          { label: 'Кабинетов', value: summary.totalLocations, icon: '🏫', color: 'var(--accent2)', onClick: () => navigate('/locations') },
          { label: 'Актов', value: summary.totalSessions, icon: '📋', color: 'var(--text2)', onClick: () => navigate('/inventory') },
          { label: 'Завершено', value: summary.completedSessions, icon: '✅', color: 'var(--accent2)', onClick: () => navigate('/inventory') },
          { label: 'В процессе', value: summary.inProgressSessions, icon: '🔵', color: '#3b82f6', onClick: () => navigate('/inventory') },
        ].map(s => (
          <div key={s.label} className="stat-card" onClick={s.onClick}
            style={{ textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = s.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div className="stat-label" style={{ marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Быстрые действия */}
      <div className="quick-actions">
        {[
          { icon: '📷', label: 'Новая инвентаризация', color: '#1a3a2a', border: '#2d6a45', text: '#4ade80', onClick: () => navigate('/inventory') },
          { icon: '📥', label: 'Импорт из 1С', color: '#1a2a3a', border: '#2d4a6a', text: '#60a5fa', onClick: () => navigate('/import') },
          { icon: '📦', label: 'Все ОС', color: '#1a1a2a', border: '#3d3d6a', text: '#a78bfa', onClick: () => navigate('/assets') },
          { icon: '🏫', label: 'Кабинеты', color: '#1a2a1a', border: '#3d5a3d', text: '#86efac', onClick: () => navigate('/locations') },
        ].map(a => (
          <button key={a.label} onClick={a.onClick} style={{
            background: a.color, border: `1px solid ${a.border}`, borderRadius: 12,
            padding: '14px 12px', cursor: 'pointer', textAlign: 'left', transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{a.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: a.text }}>{a.label}</div>
          </button>
        ))}
      </div>

      <div className="dash-grid-2">
        {/* Износ */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>📊 Износ ОС</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
            {deprTotal.toLocaleString()} единиц всего
          </div>
          {[
            { label: 'Хорошее (0–25%)', value: depreciation.good, color: '#4ade80' },
            { label: 'Среднее (25–50%)', value: depreciation.medium, color: '#60a5fa' },
            { label: 'Высокий (50–100%)', value: depreciation.high, color: 'var(--warn)' },
            { label: 'Полный (100%)', value: depreciation.full, color: 'var(--danger)' },
            { label: 'Нет данных', value: depreciation.unknown, color: 'var(--text3)' },
          ].map(d => (
            <div key={d.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text2)' }}>{d.label}</span>
                <span style={{ fontFamily: 'IBM Plex Mono', color: d.color, fontSize: 11 }}>
                  {d.value.toLocaleString()} · {deprTotal > 0 ? Math.round(d.value / deprTotal * 100) : 0}%
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, background: d.color,
                  width: `${deprTotal > 0 ? (d.value / deprTotal * 100) : 0}%`,
                  transition: 'width 0.6s ease'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Топ кабинетов */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>🏫 Топ кабинетов</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
            По количеству ОС
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {locationStats.map((loc, i) => (
              <div key={i} style={{ cursor: 'pointer' }} onClick={() => navigate(`/locations`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{
                    color: 'var(--text2)', maxWidth: '70%',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`} {loc.name}
                  </span>
                  <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--accent)', fontSize: 11, flexShrink: 0 }}>
                    {loc.count}
                  </span>
                </div>
                <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: `hsl(${160 + i * 12}, 65%, 50%)`,
                    width: `${(loc.count / maxCount) * 100}%`,
                    transition: 'width 0.6s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Последние инвентаризации */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>📋 Последние инвентаризации</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Выполнено {inventoryRate}% актов · {summary.completedSessions} из {summary.totalSessions}
            </div>
          </div>
          <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => navigate('/inventory')}>
            Все →
          </button>
        </div>

        {recentSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div>Нет инвентаризаций</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentSessions.map(s => {
              const prog = sessionProgress(s)
              const isCompleted = s.status === 'COMPLETED'
              return (
                <div key={s.id}
                  style={{
                    padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10,
                    cursor: 'pointer', border: '1px solid var(--border)', transition: 'border-color 0.15s',
                  }}
                  onClick={() => navigate(`/inventory/${s.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        📍 {s.location} · {fmtDate(s.startedAt)}
                      </div>
                    </div>
                    <span className={`badge ${isCompleted ? 'badge-completed' : 'badge-progress'}`} style={{ flexShrink: 0 }}>
                      {isCompleted ? 'Завершён' : 'В процессе'}
                    </span>
                  </div>

                  {/* Прогресс-бар */}
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: isCompleted ? '#4ade80' : 'var(--accent)',
                      width: `${prog}%`, transition: 'width 0.5s ease'
                    }} />
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                    <span style={{ color: '#4ade80' }}>✅ {s.found}</span>
                    <span style={{ color: 'var(--danger)' }}>❌ {s.notFound}</span>
                    <span style={{ color: 'var(--warn)' }}>⚠️ {s.misplaced}</span>
                    <span style={{ color: 'var(--text3)' }}>⏳ {s.pending}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text3)' }}>{prog}% · {s.total} ОС</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}