import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../api/client'

interface LocationWithCount {
  id: number
  name: string
  count: number
}

interface Asset {
  id: number
  inventoryNumber: string
  name: string
  assetType: string
  barcode: string | null
  responsiblePerson: { fullName: string }
  employee: { fullName: string } | null
}

interface LocationData {
  location: { id: number; name: string }
  assets: Asset[]
  total: number
}

// ===== Страница со списком всех кабинетов =====
export function LocationsListPage() {
  const [locations, setLocations] = useState<LocationWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState<'name' | 'count'>('count')
  const navigate = useNavigate()

  // Синхронизируем поиск в URL
  const syncUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    navigate({ search: params.toString() ? `?${params}` : '' }, { replace: true })
  }, [search, navigate])

  useEffect(() => { syncUrl() }, [syncUrl])

  useEffect(() => {
    api.get<LocationWithCount[]>('/locations/with-counts')
      .then(r => setLocations(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = [...locations]
    if (search) list = list.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
    list.sort((a, b) => sortBy === 'count' ? b.count - a.count : a.name.localeCompare(b.name, 'ru'))
    return list
  }, [locations, search, sortBy])

  const totalAssets = locations.reduce((s, l) => s + l.count, 0)
  const maxCount = Math.max(...locations.map(l => l.count), 1)

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Кабинеты</div>
          <div className="page-subtitle">
            {locations.length} кабинетов · {totalAssets.toLocaleString()} ОС всего
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="input" style={{ flex: 1, minWidth: 200 }}
          placeholder="🔍 Поиск кабинета..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['count', 'name'] as const).map(s => (
            <button key={s}
              className={`btn ${sortBy === s ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => setSortBy(s)}
            >
              {s === 'count' ? '🔢 По кол-ву' : '🔤 По алфавиту'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(loc => (
          <div
            key={loc.id}
            onClick={() => navigate(`/locations/${loc.id}`)}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
              transition: 'border-color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                minWidth: 64, height: 64, borderRadius: 12,
                background: 'var(--bg3)', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  fontFamily: 'IBM Plex Mono', fontWeight: 700,
                  fontSize: loc.count >= 100 ? 20 : 24,
                  color: loc.count > 50 ? 'var(--accent)' : 'var(--text)',
                }}>
                  {loc.count}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ОС
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: 14, marginBottom: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  🏫 {loc.name}
                </div>
                <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: `hsl(${210 - (loc.count / maxCount) * 60}, 70%, 55%)`,
                    width: `${(loc.count / maxCount) * 100}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  {((loc.count / totalAssets) * 100).toFixed(1)}% от всех ОС
                </div>
              </div>

              <div style={{ fontSize: 18, color: 'var(--text3)', flexShrink: 0 }}>›</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Страница конкретного кабинета =====
export function LocationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState<'name' | 'inventoryNumber'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Синхронизируем поиск в URL
  const syncUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    navigate({ search: params.toString() ? `?${params}` : '' }, { replace: true })
  }, [search, navigate])

  useEffect(() => { syncUrl() }, [syncUrl])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<LocationData>(`/locations/${id}/assets`)
        setData(res.data)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  const filtered = useMemo(() => {
    if (!data) return []
    let list = [...data.assets]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.inventoryNumber.toLowerCase().includes(q) ||
        (a.barcode || '').includes(q)
      )
    }
    list.sort((a, b) => {
      const va = a[sortBy], vb = b[sortBy]
      return sortDir === 'asc' ? va.localeCompare(vb, 'ru') : vb.localeCompare(va, 'ru')
    })
    return list
  }, [data, search, sortBy, sortDir])

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  if (loading) return <div className="loading">Загрузка...</div>
  if (!data) return <div className="empty"><div>Кабинет не найден</div></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline"
            style={{ marginBottom: 8, fontSize: 12, padding: '4px 10px' }}
            onClick={() => navigate('/locations')}>
            ← Кабинеты
          </button>
          <div className="page-title">🏫 {data.location.name}</div>
          <div className="page-subtitle">{data.total} основных средств</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          className="input" style={{ flex: 1, minWidth: 200 }}
          placeholder="🔍 Поиск по названию, инв. номеру..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>
          {filtered.length} из {data.total}
        </span>
      </div>

      <div className="mobile-only" style={{ flexDirection: 'column', gap: 8 }}>
        {filtered.map(a => (
          <div
            key={a.id}
            onClick={() => navigate(`/assets/${a.id}`)}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{a.name}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{a.inventoryNumber}</span>
              {a.barcode && <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>📊 {a.barcode}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {a.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
              {a.employee && ` · ${a.employee.fullName.split(' ')[0]}`}
            </div>
          </div>
        ))}
      </div>

      <div className="table-wrap desktop-only">
        <table>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('inventoryNumber')}>
                Инв. номер {sortBy === 'inventoryNumber' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                Наименование {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </th>
              <th>Тип</th>
              <th>Штрих-код</th>
              <th>МОЛ</th>
              <th>Сотрудник</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/assets/${a.id}`)}>
                <td><span className="mono">{a.inventoryNumber}</span></td>
                <td style={{ fontSize: 13 }}>{a.name}</td>
                <td style={{ fontSize: 12, color: 'var(--text3)' }}>{a.assetType}</td>
                <td><span className="mono" style={{ fontSize: 11 }}>{a.barcode || '—'}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {a.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {a.employee?.fullName || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}