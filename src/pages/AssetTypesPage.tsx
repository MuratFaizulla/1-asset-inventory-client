import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { API_BASE } from '../api/client'

interface GroupedAsset {
  name: string
  assetType: string
  assetFaType: string | null
  count: number
}

interface LocationBreakdown {
  name: string
  total: number
  locations: Array<{ locationId: number; locationName: string; count: number }>
}

const photoKey = (name: string) =>
  encodeURIComponent(name.trim().toLowerCase().replace(/\s+/g, '_'))

export default function AssetTypesPage() {
  const [items, setItems] = useState<GroupedAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count')
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<LocationBreakdown | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/assets/grouped'),
      api.get('/photos'),
    ]).then(([groupedRes, photosRes]) => {
      setItems(groupedRes.data)
      // БД хранит декодированные ключи, photoKey() возвращает закодированный для URL
      // Для сравнения используем rawKey (без encodeURIComponent)
      const existingKeys: string[] = photosRes.data
      const photoMap: Record<string, string> = {}
      groupedRes.data.forEach((item: GroupedAsset) => {
        const rawKey = item.name.trim().toLowerCase().replace(/\s+/g, '_')
        const urlKey = photoKey(item.name)
        if (existingKeys.includes(rawKey)) {
          photoMap[item.name] = `${API_BASE}/api/photos/${urlKey}`
        }
      })
      setPhotos(photoMap)
    }).finally(() => setLoading(false))
  }, [])

  const handleCardClick = async (item: GroupedAsset) => {
    setLoadingDetail(true)
    setSelected(null)
    try {
      const res = await api.get(`/assets/by-name/${encodeURIComponent(item.name)}/locations`)
      setSelected(res.data)
    } catch (e) { console.error(e) }
    finally { setLoadingDetail(false) }
  }

  const filtered = useMemo(() => {
    let list = [...items]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.assetType.toLowerCase().includes(q) ||
        (i.assetFaType || '').toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => sortBy === 'count'
      ? b.count - a.count
      : a.name.localeCompare(b.name, 'ru')
    )
    return list
  }, [items, search, sortBy])

  const totalUnique = items.length
  const totalAssets = items.reduce((s, i) => s + i.count, 0)
  const maxLoc = selected ? Math.max(...selected.locations.map(l => l.count), 1) : 1

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Виды ОС</div>
          <div className="page-subtitle">{totalUnique} видов · {totalAssets.toLocaleString()} штук всего</div>
        </div>
      </div>

      {/* Поиск + сортировка */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: 1, minWidth: 180 }}
          placeholder="🔍 Поиск..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <button className={`btn ${sortBy === 'count' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: 12 }} onClick={() => setSortBy('count')}>🔢 По кол-ву</button>
        <button className={`btn ${sortBy === 'name' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: 12 }} onClick={() => setSortBy('name')}>🔤 А–Я</button>
      </div>

      {/* Сетка карточек */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        {filtered.map(item => {
          const photo = photos[item.name]
          const isSelected = selected?.name === item.name
          return (
            <div
              key={item.name}
              onClick={() => handleCardClick(item)}
              style={{
                background: 'var(--bg2)',
                border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.2)' : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              {photo ? (
                <img src={photo} alt={item.name}
                  style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{
                  width: '100%', height: 140,
                  background: 'linear-gradient(135deg, var(--bg3), var(--bg2))',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <div style={{ fontSize: 42 }}>
                    {item.assetFaType?.toLowerCase().includes('ноут') ? '💻'
                    : item.assetFaType?.toLowerCase().includes('компьют') ? '🖥️'
                    : item.assetFaType?.toLowerCase().includes('принт') ? '🖨️'
                    : item.assetFaType?.toLowerCase().includes('панел') ? '📺'
                    : item.assetFaType?.toLowerCase().includes('проект') ? '📽️'
                    : '📦'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>нет фото</div>
                </div>
              )}
              <div style={{ padding: '12px 12px 14px' }}>
                <div style={{
                  fontWeight: 600, fontSize: 13, lineHeight: 1.35, marginBottom: 4,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', minHeight: 36,
                } as React.CSSProperties}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.assetFaType || item.assetType}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: isSelected ? 'rgba(59,130,246,0.15)' : 'var(--bg3)',
                  borderRadius: 10, padding: '10px 12px',
                  transition: 'background 0.15s',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.03em' }}>КОЛИЧЕСТВО</span>
                  <span style={{
                    fontFamily: 'IBM Plex Mono', fontWeight: 800, fontSize: 26, lineHeight: 1,
                    color: item.count >= 50 ? 'var(--accent)' : item.count >= 10 ? 'var(--text)' : 'var(--text2)',
                  }}>{item.count}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty"><div className="empty-icon">📦</div><div>Ничего не найдено</div></div>
      )}

      {/* ===== Модалка с разбивкой по кабинетам ===== */}
      {(selected || loadingDetail) && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 520 }}>

            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
                ⏳ Загрузка...
              </div>
            ) : selected && (
              <>
                {/* Шапка */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{selected.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                      Всего: <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>
                        {selected.total}
                      </span> шт. в {selected.locations.length} кабинетах
                    </div>
                  </div>
                  <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', flexShrink: 0 }}
                    onClick={() => setSelected(null)}>✕</button>
                </div>

                {/* Список кабинетов */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
                  {selected.locations.map((loc, i) => (
                    <div
                      key={loc.locationId}
                      onClick={() => {
                      navigate(`/assets?search=${encodeURIComponent(selected!.name)}&locationId=${loc.locationId}`)
                      setSelected(null)
                    }}
                      style={{
                        padding: '12px 14px', background: 'var(--bg3)',
                        borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, flex: 1, paddingRight: 10 }}>
                          🏫 {loc.locationName}
                        </div>
                        <div style={{
                          fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 20,
                          color: i === 0 ? 'var(--accent)' : 'var(--text)',
                          flexShrink: 0,
                        }}>{loc.count}</div>
                      </div>
                      {/* Прогресс-бар */}
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: `hsl(${220 - (i * 15)}, 70%, 55%)`,
                          width: `${(loc.count / maxLoc) * 100}%`,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Кнопка — посмотреть все */}
                <div style={{ marginTop: 16 }}>
                  <button className="btn btn-outline" style={{ width: '100%', fontSize: 13 }}
                    onClick={() => { navigate(`/assets?search=${encodeURIComponent(selected.name)}`); setSelected(null) }}>
                    📋 Посмотреть все {selected.total} ОС в таблице →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}