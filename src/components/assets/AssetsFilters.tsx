// components/assets/AssetsFilters.tsx

import type { Location, Person } from './types'

interface Props {
  search:              string
  locationId:          string
  responsiblePersonId: string
  employeeId:          string
  showFilters:         boolean
  locations:           Location[]
  persons:             Person[]
  employees:           Person[]
  onSearch:            (e: React.ChangeEvent<HTMLInputElement>) => void
  onLocationChange:    (v: string) => void
  onPersonChange:      (v: string) => void
  onEmployeeChange:    (v: string) => void
  onToggleFilters:     () => void
  onReset:             () => void
}

export default function AssetsFilters({
  search, locationId, responsiblePersonId, employeeId,
  showFilters, locations, persons, employees,
  onSearch, onLocationChange, onPersonChange, onEmployeeChange,
  onToggleFilters, onReset,
}: Props) {
  const activeFilterCount = [locationId, responsiblePersonId, employeeId].filter(Boolean).length
  const hasFilters        = !!(search || locationId || responsiblePersonId || employeeId)

  return (
    <>
      {/* Поиск + кнопка фильтров */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          className="input"
          style={{ flex: 1, minHeight: 44 }}
          placeholder="🔍 Поиск по названию, инв. номеру..."
          value={search}
          onChange={onSearch}
        />

        <button
          className={`btn ${showFilters || activeFilterCount > 0 ? 'btn-primary' : 'btn-outline'}`}
          style={{ minHeight: 44, padding: '0 14px', fontSize: 13, flexShrink: 0, position: 'relative' }}
          onClick={onToggleFilters}
        >
          ⚙️ Фильтры
          {activeFilterCount > 0 && (
            <span style={{
              position:       'absolute',
              top:            -6,
              right:          -6,
              background:     'var(--danger)',
              color:          '#fff',
              borderRadius:   '50%',
              width:          18,
              height:         18,
              fontSize:       11,
              fontWeight:     700,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            className="btn btn-outline"
            style={{ minHeight: 44, padding: '0 12px', fontSize: 13, flexShrink: 0 }}
            onClick={onReset}
          >
            ✕
          </button>
        )}
      </div>

      {/* Раскрывающиеся фильтры */}
      {showFilters && (
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           8,
          marginBottom:  12,
          padding:       '14px',
          background:    'var(--bg2)',
          border:        '1px solid var(--border)',
          borderRadius:  12,
        }}>
          <select
            className="input"
            style={{ minHeight: 44 }}
            value={locationId}
            onChange={e => onLocationChange(e.target.value)}
          >
            <option value="">📍 Все помещения</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          <select
            className="input"
            style={{ minHeight: 44 }}
            value={responsiblePersonId}
            onChange={e => onPersonChange(e.target.value)}
          >
            <option value="">👤 Все МОЛ</option>
            {persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>

          <select
            className="input"
            style={{ minHeight: 44 }}
            value={employeeId}
            onChange={e => onEmployeeChange(e.target.value)}
          >
            <option value="">🧑‍💼 Все сотрудники</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </div>
      )}
    </>
  )
}