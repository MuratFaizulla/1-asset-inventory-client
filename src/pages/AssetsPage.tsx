// pages/AssetsPage.tsx

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'

import type { Asset, Meta, Location, Person } from '../components/assets/types'
import AssetsFilters    from '../components/assets/AssetsFilters'
import AssetsMobileList from '../components/assets/AssetsMobileList'
import AssetsTable      from '../components/assets/AssetsTable'
import AssetsPagination from '../components/assets/AssetsPagination'

export default function AssetsPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  // ── Данные ────────────────────────────────────────────────────────────────────
  const [assets,    setAssets]    = useState<Asset[]>([])
  const [meta,      setMeta]      = useState<Meta>({ total: 0, page: 1, totalPages: 1 })
  const [loading,   setLoading]   = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [persons,   setPersons]   = useState<Person[]>([])
  const [employees, setEmployees] = useState<Person[]>([])

  // ── Фильтры ───────────────────────────────────────────────────────────────────
  const [search,              setSearch]              = useState(searchParams.get('search')     || '')
  const [page,                setPage]                = useState(Number(searchParams.get('page')) || 1)
  const [locationId,          setLocationId]          = useState(searchParams.get('locationId') || '')
  const [responsiblePersonId, setResponsiblePersonId] = useState('')
  const [employeeId,          setEmployeeId]          = useState('')
  const [showFilters,         setShowFilters]         = useState(false)

  // ── Синхронизация URL ─────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams()
    if (search)              params.set('search',              search)
    if (locationId)          params.set('locationId',          locationId)
    if (responsiblePersonId) params.set('responsiblePersonId', responsiblePersonId)
    if (employeeId)          params.set('employeeId',          employeeId)
    if (page > 1)            params.set('page',                String(page))
    const qs = params.toString()
    navigate({ search: qs ? `?${qs}` : '' }, { replace: true })
  }, [search, locationId, responsiblePersonId, employeeId, page, navigate])

  // ── Загрузка данных ───────────────────────────────────────────────────────────
  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page,
        limit:   200,
        sortBy:  'inventoryNumber',
        sortDir: 'asc',
      }
      if (search)              params.search              = search
      if (locationId)          params.locationId          = locationId
      if (responsiblePersonId) params.responsiblePersonId = responsiblePersonId
      if (employeeId)          params.employeeId          = employeeId

      const res = await api.get('/assets', { params })
      setAssets(res.data.data)
      setMeta({ total: res.data.total, page: res.data.page, totalPages: res.data.totalPages })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, search, locationId, responsiblePersonId, employeeId])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  useEffect(() => {
    api.get('/locations').then(r => setLocations(r.data)).catch(() => {})
    api.get('/locations/responsible-persons').then(r => setPersons(r.data)).catch(() => {})
    api.get('/locations/employees').then(r => setEmployees(r.data)).catch(() => {})
  }, [])

  // ── Хендлеры ─────────────────────────────────────────────────────────────────
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const resetFilters = () => {
    setSearch('')
    setLocationId('')
    setResponsiblePersonId('')
    setEmployeeId('')
    setPage(1)
  }

  const hasFilters = !!(search || locationId || responsiblePersonId || employeeId)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Основные средства</div>
          <div className="page-subtitle">Всего: {meta.total} записей</div>
        </div>
      </div>

      <AssetsFilters
        search={search}
        locationId={locationId}
        responsiblePersonId={responsiblePersonId}
        employeeId={employeeId}
        showFilters={showFilters}
        locations={locations}
        persons={persons}
        employees={employees}
        onSearch={handleSearch}
        onLocationChange={v => { setLocationId(v);          setPage(1) }}
        onPersonChange={v   => { setResponsiblePersonId(v); setPage(1) }}
        onEmployeeChange={v => { setEmployeeId(v);          setPage(1) }}
        onToggleFilters={() => setShowFilters(v => !v)}
        onReset={resetFilters}
      />

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : assets.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div>{hasFilters ? 'Ничего не найдено' : 'Нет данных. Загрузите Excel файл из 1С'}</div>
        </div>
      ) : (
        <>
          <AssetsMobileList
            assets={assets}
            meta={meta}
            onSelect={id => navigate(`/assets/${id}`)}
          />

          <AssetsTable
            assets={assets}
            meta={meta}
            onSelect={id => navigate(`/assets/${id}`)}
          />

          <AssetsPagination
            meta={meta}
            page={page}
            onFirst={() => setPage(1)}
            onPrev={() =>  setPage(p => p - 1)}
            onNext={() =>  setPage(p => p + 1)}
            onLast={() =>  setPage(meta.totalPages)}
          />
        </>
      )}
    </div>
  )
}










// import { useState, useEffect, useCallback } from 'react'
// import { useNavigate, useSearchParams } from 'react-router-dom'
// import api from '../api/client'

// interface Asset {
//   id: number
//   inventoryNumber: string
//   name: string
//   assetType: string
//   barcode: string | null
//   location: { name: string }
//   responsiblePerson: { fullName: string }
//   organization: { name: string }
//   employee: { fullName: string } | null
// }

// interface Meta {
//   total: number
//   page: number
//   totalPages: number
// }

// interface Location {
//   id: number
//   name: string
// }

// interface Person {
//   id: number
//   fullName: string
// }

// export default function AssetsPage() {
//   const [searchParams] = useSearchParams()
//   const [assets, setAssets] = useState<Asset[]>([])
//   const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, totalPages: 1 })
//   const [search, setSearch] = useState(searchParams.get('search') || '')
//   const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
//   const [loading, setLoading] = useState(false)
//   const [locations, setLocations] = useState<Location[]>([])
//   const [persons, setPersons] = useState<Person[]>([])
//   const [employees, setEmployees] = useState<Person[]>([])
//   const [locationId, setLocationId] = useState(searchParams.get('locationId') || '')
//   const [responsiblePersonId, setResponsiblePersonId] = useState('')
//   const [employeeId, setEmployeeId] = useState('')
//   const [showFilters, setShowFilters] = useState(false)

//   const navigate = useNavigate()

//   // Синхронизируем фильтры в URL — чтобы "назад" восстанавливал состояние
//   useEffect(() => {
//     const params = new URLSearchParams()
//     if (search) params.set('search', search)
//     if (locationId) params.set('locationId', locationId)
//     if (responsiblePersonId) params.set('responsiblePersonId', responsiblePersonId)
//     if (employeeId) params.set('employeeId', employeeId)
//     if (page > 1) params.set('page', String(page))
//     const qs = params.toString()
//     navigate({ search: qs ? `?${qs}` : '' }, { replace: true })
//   }, [search, locationId, responsiblePersonId, employeeId, page, navigate])

//   const fetchAssets = useCallback(async () => {
//     setLoading(true)
//     try {
//       const params: Record<string, string | number> = {
//         page,
//         limit: 200,
//         sortBy: 'inventoryNumber',
//         sortDir: 'asc',
//       }
//       if (search) params.search = search
//       if (locationId) params.locationId = locationId
//       if (responsiblePersonId) params.responsiblePersonId = responsiblePersonId
//       if (employeeId) params.employeeId = employeeId
//       const res = await api.get('/assets', { params })
//       setAssets(res.data.data)
//       setMeta({ total: res.data.total, page: res.data.page, totalPages: res.data.totalPages })
//     } catch (e) {
//       console.error(e)
//     } finally {
//       setLoading(false)
//     }
//   }, [page, search, locationId, responsiblePersonId, employeeId])

//   useEffect(() => { fetchAssets() }, [fetchAssets])

//   useEffect(() => {
//     api.get('/locations').then(r => setLocations(r.data)).catch(() => {})
//     api.get('/locations/responsible-persons').then(r => setPersons(r.data)).catch(() => {})
//     api.get('/locations/employees').then(r => setEmployees(r.data)).catch(() => {})
//   }, [])

//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearch(e.target.value)
//     setPage(1)
//   }

//   const hasFilters = !!(search || locationId || responsiblePersonId || employeeId)
//   const activeFilterCount = [locationId, responsiblePersonId, employeeId].filter(Boolean).length

//   const resetFilters = () => {
//     setSearch('')
//     setLocationId('')
//     setResponsiblePersonId('')
//     setEmployeeId('')
//     setPage(1)
//   }

//   return (
//     <div>
//       <div className="page-header">
//         <div>
//           <div className="page-title">Основные средства</div>
//           <div className="page-subtitle">Всего: {meta.total} записей</div>
//         </div>
//       </div>

//       {/* Поиск + кнопка фильтров */}
//       <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
//         <input
//           className="input" style={{ flex: 1, minHeight: 44 }}
//           placeholder="🔍 Поиск по названию, инв. номеру..."
//           value={search} onChange={handleSearch}
//         />
//         <button
//           className={`btn ${showFilters || activeFilterCount > 0 ? 'btn-primary' : 'btn-outline'}`}
//           style={{ minHeight: 44, padding: '0 14px', fontSize: 13, flexShrink: 0, position: 'relative' }}
//           onClick={() => setShowFilters(v => !v)}
//         >
//           ⚙️ Фильтры
//           {activeFilterCount > 0 && (
//             <span style={{
//               position: 'absolute', top: -6, right: -6,
//               background: 'var(--danger)', color: '#fff',
//               borderRadius: '50%', width: 18, height: 18,
//               fontSize: 11, fontWeight: 700,
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//             }}>{activeFilterCount}</span>
//           )}
//         </button>
//         {hasFilters && (
//           <button className="btn btn-outline" style={{ minHeight: 44, padding: '0 12px', fontSize: 13, flexShrink: 0 }}
//             onClick={resetFilters}>✕</button>
//         )}
//       </div>

//       {/* Раскрывающиеся фильтры */}
//       {showFilters && (
//         <div style={{
//           display: 'flex', flexDirection: 'column', gap: 8,
//           marginBottom: 12, padding: '14px', background: 'var(--bg2)',
//           border: '1px solid var(--border)', borderRadius: 12,
//         }}>
//           <select className="input" style={{ minHeight: 44 }} value={locationId}
//             onChange={e => { setLocationId(e.target.value); setPage(1) }}>
//             <option value="">📍 Все помещения</option>
//             {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
//           </select>
//           <select className="input" style={{ minHeight: 44 }} value={responsiblePersonId}
//             onChange={e => { setResponsiblePersonId(e.target.value); setPage(1) }}>
//             <option value="">👤 Все МОЛ</option>
//             {persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
//           </select>
//           <select className="input" style={{ minHeight: 44 }} value={employeeId}
//             onChange={e => { setEmployeeId(e.target.value); setPage(1) }}>
//             <option value="">🧑‍💼 Все сотрудники</option>
//             {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
//           </select>
//         </div>
//       )}

//       {loading ? (
//         <div className="loading">Загрузка...</div>
//       ) : assets.length === 0 ? (
//         <div className="empty">
//           <div className="empty-icon">📭</div>
//           <div>{hasFilters ? 'Ничего не найдено' : 'Нет данных. Загрузите Excel файл из 1С'}</div>
//         </div>
//       ) : (
//         <>
//           {/* МОБИЛЬ — карточки */}
//           <div className="mobile-only" style={{ flexDirection: 'column', gap: 8 }}>
//             {assets.map((a, i) => (
//               <div key={a.id}
//                 onClick={() => navigate(`/assets/${a.id}`)}
//                 style={{
//                   background: 'var(--bg2)', border: '1px solid var(--border)',
//                   borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
//                   WebkitTapHighlightColor: 'transparent',
//                 }}
//               >
//                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
//                   <div style={{ flex: 1, minWidth: 0 }}>
//                     <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>{a.name}</div>
//                     <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
//                       <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{a.inventoryNumber}</span>
//                       {a.barcode && <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>📊 {a.barcode}</span>}
//                     </div>
//                     <div style={{ fontSize: 12, color: 'var(--text2)' }}>📍 {a.location.name}</div>
//                     <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
//                       {a.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
//                       {a.employee && ` · ${a.employee.fullName.split(' ')[0]}`}
//                     </div>
//                   </div>
//                   <div style={{
//                     fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text3)',
//                     flexShrink: 0, paddingTop: 2,
//                   }}>#{(meta.page - 1) * 200 + i + 1}</div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* ДЕСКТОП — таблица */}
//           <div className="table-wrap desktop-only">
//             <table>
//               <thead>
//                 <tr>
//                   <th style={{ width: 48, textAlign: 'center', color: 'var(--text3)' }}>#</th>
//                   <th>Инв. номер</th>
//                   <th>Наименование</th>
//                   <th>Местонахождение</th>
//                   <th>МОЛ</th>
//                   <th>Сотрудник</th>
//                   <th>Штрих-код</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {assets.map((a, i) => (
//                   <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/assets/${a.id}`)}>
//                     <td style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, fontFamily: 'IBM Plex Mono' }}>
//                       {(meta.page - 1) * 200 + i + 1}
//                     </td>
//                     <td><span className="mono">{a.inventoryNumber}</span></td>
//                     <td style={{ maxWidth: 240 }}>{a.name}</td>
//                     <td style={{ color: 'var(--text2)', fontSize: 12 }}>{a.location.name}</td>
//                     <td style={{ color: 'var(--text2)', fontSize: 12 }}>
//                       {a.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
//                     </td>
//                     <td style={{ color: 'var(--text2)', fontSize: 12 }}>
//                       {a.employee ? a.employee.fullName.split(' ').slice(0, 2).join(' ') : '—'}
//                     </td>
//                     <td><span className="mono">{a.barcode || '—'}</span></td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Пагинация */}
//           <div className="pagination">
//             <span style={{ fontSize: 13, color: 'var(--text3)', marginRight: 'auto' }}>
//               {(meta.page - 1) * 200 + 1}–{Math.min(meta.page * 200, meta.total)} из {meta.total}
//             </span>
//             <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage(1)}>«</button>
//             <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
//             <span style={{ fontSize: 13 }}>{meta.page} / {meta.totalPages}</span>
//             <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>→</button>
//             <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={() => setPage(meta.totalPages)}>»</button>
//           </div>
//         </>
//       )}
//     </div>
//   )
// }

