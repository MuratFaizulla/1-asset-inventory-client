import { useMemo, useCallback, useState } from 'react'
import type { AssetItem, ItemStatus, SortCol, Location, Employee } from './types'
import { STATUS_COLOR, STATUS_LABEL, STATUS_BADGE } from './types'

interface Props {
  items: AssetItem[]
  total: number
  isActive: boolean
  cancelling: number | null
  locations: Location[]
  persons: Employee[]
  employees: Employee[]
  onRelocate: (item: AssetItem) => void
  onCancelScan: (itemId: number) => void
}

export default function ItemsList({
  items,
  total,
  isActive,
  cancelling,
  locations,
  persons,
  employees,
  onRelocate,
  onCancelScan,
}: Props) {
  // ── Фильтры ────────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<ItemStatus | ''>('')
  const [tableSearch, setTableSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterLocationId, setFilterLocationId] = useState('')
  const [filterPersonId, setFilterPersonId] = useState('')
  const [filterEmployeeId, setFilterEmployeeId] = useState('')

  // ── Сортировка ─────────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortCol>('inventoryNumber')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (col: SortCol) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const sortItems = useCallback((list: AssetItem[]) => {
    return [...list].sort((a, b) => {
      let result = 0
      if (sortBy === 'inventoryNumber') {
        const nA = parseInt(a.asset.inventoryNumber.replace(/\D/g, ''), 10)
        const nB = parseInt(b.asset.inventoryNumber.replace(/\D/g, ''), 10)
        result = (!isNaN(nA) && !isNaN(nB))
          ? nA - nB
          : a.asset.inventoryNumber.localeCompare(b.asset.inventoryNumber)
      } else if (sortBy === 'name') {
        result = a.asset.name.localeCompare(b.asset.name)
      } else if (sortBy === 'status') {
        const o: Record<ItemStatus, number> = { MISPLACED: 0, NOT_FOUND: 1, PENDING: 2, FOUND: 3 }
        result = o[a.status] - o[b.status]
      } else if (sortBy === 'scannedAt') {
        result = (a.scannedAt || '').localeCompare(b.scannedAt || '')
      }
      return sortDir === 'asc' ? result : -result
    })
  }, [sortBy, sortDir])

  // ── Отфильтрованный + отсортированный список ───────────────────────────────
  const filteredItems = useMemo(() => {
    let list = [...items]
    if (filterStatus) list = list.filter(i => i.status === filterStatus)
    if (tableSearch) {
      const q = tableSearch.toLowerCase()
      list = list.filter(i =>
        i.asset.inventoryNumber.toLowerCase().includes(q) ||
        i.asset.name.toLowerCase().includes(q) ||
        i.asset.location.name.toLowerCase().includes(q)
      )
    }
    if (filterLocationId) list = list.filter(i => String(i.asset.location.id) === filterLocationId)
    if (filterPersonId) list = list.filter(i => String(i.asset.responsiblePerson.id) === filterPersonId)
    if (filterEmployeeId) list = list.filter(i => String(i.asset.employee?.id) === filterEmployeeId)
    return sortItems(list)
  }, [items, filterStatus, tableSearch, sortItems, filterLocationId, filterPersonId, filterEmployeeId])

  // Глобальная нумерация для двойного счётчика в таблице
  const globalIndexMap = useMemo(() => {
    const map = new Map<number, number>()
    sortItems(items).forEach((item, i) => map.set(item.id, i + 1))
    return map
  }, [items, sortItems])

  const activeFilterCount = [filterLocationId, filterPersonId, filterEmployeeId].filter(Boolean).length

  const renderSortTh = (col: SortCol, label: string) => (
    <th
      className="sort-th"
      style={{
        background: sortBy === col ? 'var(--bg3)' : undefined,
        color: sortBy === col ? 'var(--accent)' : undefined,
      }}
      onClick={() => handleSort(col)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ fontSize: 10, opacity: sortBy === col ? 1 : 0.3 }}>
          {sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  )

  return (
    <div>
      {/* ── Поиск + кнопка фильтров ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input" style={{ flex: 1, minWidth: 160, minHeight: 42 }}
          placeholder="🔍 Поиск..."
          value={tableSearch}
          onChange={e => setTableSearch(e.target.value)}
        />

        <button
          className={`btn ${showFilters || activeFilterCount > 0 ? 'btn-primary' : 'btn-outline'}`}
          style={{ minHeight: 42, padding: '0 14px', fontSize: 13, flexShrink: 0, position: 'relative' }}
          onClick={() => setShowFilters(v => !v)}
        >
          ⚙️ Фильтры
          {activeFilterCount > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              background: 'var(--danger)', color: '#fff',
              borderRadius: '50%', width: 18, height: 18,
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            className="btn btn-outline"
            style={{ minHeight: 42, padding: '0 12px', fontSize: 13, flexShrink: 0 }}
            onClick={() => { setFilterLocationId(''); setFilterPersonId(''); setFilterEmployeeId('') }}
          >
            ✕
          </button>
        )}

        <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
          {filteredItems.length} из {total}
        </span>
      </div>

      {/* ── Раскрывающиеся фильтры ── */}
      {showFilters && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          marginBottom: 12, padding: 14,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <select className="input" style={{ minHeight: 44 }} value={filterLocationId}
            onChange={e => setFilterLocationId(e.target.value)}>
            <option value="">📍 Все помещения</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="input" style={{ minHeight: 44 }} value={filterPersonId}
            onChange={e => setFilterPersonId(e.target.value)}>
            <option value="">👤 Все МОЛ</option>
            {persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
          <select className="input" style={{ minHeight: 44 }} value={filterEmployeeId}
            onChange={e => setFilterEmployeeId(e.target.value)}>
            <option value="">🧑‍💼 Все сотрудники</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </div>
      )}

      {/* ── Кнопки статусов ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 } as React.CSSProperties}>
        {(['', 'PENDING', 'FOUND', 'NOT_FOUND', 'MISPLACED'] as const).map(s => {
          const labels: Record<string, string> = {
            '': 'Все', PENDING: 'Не провер.', FOUND: 'Найдено', NOT_FOUND: 'Не найдено', MISPLACED: '⚠️ Место',
          }
          const count = s === '' ? total : items.filter(i => i.status === s).length
          return (
            <button key={s}
              className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap', minHeight: 36, flexShrink: 0 }}
              onClick={() => setFilterStatus(s)}
            >
              {labels[s]} ({count})
            </button>
          )
        })}
      </div>

      {/* ── МОБИЛЬ: карточки ── */}
      <div className="mobile-only" style={{ flexDirection: 'column', gap: 8 }}>
        {filteredItems.length === 0
          ? <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Ничего не найдено</div>
          : filteredItems.map(item => (
            <div key={item.id} style={{
              background: item.status === 'MISPLACED' ? '#451a0310' : 'var(--bg2)',
              border: `1px solid ${STATUS_COLOR[item.status]}44`,
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, paddingRight: 8 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.3, marginBottom: 3 }}>
                    {item.asset.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {item.asset.inventoryNumber}
                    </span>
                    {item.asset.barcode && (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                        📊 {item.asset.barcode}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[item.status]}`} style={{ flexShrink: 0 }}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                📍 {item.asset.location.name}
                {item.scannedAt && (
                  <span style={{ marginLeft: 10 }}>
                    🕐 {new Date(item.scannedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {item.scannedBy && <span style={{ marginLeft: 10 }}>👤 {item.scannedBy}</span>}
              </div>

              {/* МОЛ + Сотрудник */}
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                👤 {item.asset.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
                {item.asset.employee && (
                  <span style={{ marginLeft: 10 }}>
                    🧑‍💼 {item.asset.employee.fullName.split(' ').slice(0, 2).join(' ')}
                  </span>
                )}
              </div>

              {item.note && (
                <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 4 }}>{item.note}</div>
              )}

              {isActive && item.status !== 'PENDING' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, minHeight: 38, fontSize: 12 }}
                    onClick={() => onRelocate(item)}>
                    ✏️ Изменить
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ minHeight: 38, fontSize: 12, padding: '0 12px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => onCancelScan(item.id)}
                    disabled={cancelling === item.id}
                  >
                    {cancelling === item.id ? '...' : '✕ Отменить'}
                  </button>
                </div>
              )}
            </div>
          ))
        }
      </div>

      {/* ── ДЕСКТОП: таблица ── */}
      <div className="table-wrap desktop-only">
        <table>
          <thead>
            <tr>
              <th style={{ width: 52, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>
                №{filterStatus ? <span style={{ fontSize: 9, display: 'block', opacity: 0.6 }}>/всего</span> : null}
              </th>
              {renderSortTh('inventoryNumber', 'Инв. номер')}
              {renderSortTh('name', 'Наименование')}
              <th>Штрих-код</th>
              <th>По данным 1С</th>
              <th>МОЛ</th>
              <th>Сотрудник</th>{/* ← новая колонка */}
              {renderSortTh('status', 'Статус')}
              <th>Примечание</th>
              {renderSortTh('scannedAt', 'Время')}
              <th>Кто сканировал</th>
              {isActive && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => (
              <tr key={item.id} style={{ background: item.status === 'MISPLACED' ? '#451a0308' : undefined }}>
                <td style={{ textAlign: 'center', padding: '6px 4px', width: 52 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text1)', fontWeight: 600 }}>
                    {idx + 1}
                  </div>
                  {filterStatus && (
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                      /{globalIndexMap.get(item.id)}
                    </div>
                  )}
                </td>
                <td><span className="mono">{item.asset.inventoryNumber}</span></td>
                <td style={{ maxWidth: 200, fontSize: 13 }}>{item.asset.name}</td>
                <td><span className="mono" style={{ fontSize: 11 }}>{item.asset.barcode || '—'}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>{item.asset.location.name}</td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {item.asset.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
                </td>
                {/* ← новая ячейка: сотрудник */}
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {item.asset.employee
                    ? item.asset.employee.fullName.split(' ').slice(0, 2).join(' ')
                    : <span style={{ color: 'var(--text3)' }}>—</span>
                  }
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--warn)', maxWidth: 180 }}>{item.note || ''}</td>
                <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {item.scannedAt
                    ? new Date(item.scannedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text3)' }}>{item.scannedBy || '—'}</td>
                {isActive && (
                  <td>
                    {item.status !== 'PENDING' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline" style={{ fontSize: 11, padding: '2px 8px' }}
                          onClick={() => onRelocate(item)}>✏️</button>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: 11, padding: '2px 8px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => onCancelScan(item.id)}
                          disabled={cancelling === item.id}
                        >
                          {cancelling === item.id ? '...' : '✕'}
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}