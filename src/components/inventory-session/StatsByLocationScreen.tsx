import { useState } from 'react'

// ── Типы ─────────────────────────────────────────────────────────────────────

export type AssetInfo = {
  id:                number
  itemId:            number
  name:              string
  inventoryNumber:   string
  barcode:           string | null
  responsiblePerson: string | null
  employee:          string | null
  scannedAt:         string | null
  scannedBy:         string | null
  note:              string | null
}

export type LocationStat = {
  locationId:      number
  locationName:    string
  total:           number
  found:           number
  notFound:        number
  misplaced:       number
  pending:         number
  progress:        number
  totalAssets:     AssetInfo[]
  foundAssets:     AssetInfo[]
  notFoundAssets:  AssetInfo[]
  misplacedAssets: AssetInfo[]
  pendingAssets:   AssetInfo[]
}

type ExpandedType = 'total' | 'found' | 'notFound' | 'misplaced' | 'pending' | null

interface Props {
  stats:     LocationStat[]
  loading:   boolean
  onBack:    () => void
  onRefresh: () => void
}

// ── Хелпер цвета прогресса ────────────────────────────────────────────────────
const progressColor = (p: number) =>
  p === 100 ? 'var(--accent2)' : p > 50 ? 'var(--accent)' : 'var(--warn)'

// ── Скелетон ──────────────────────────────────────────────────────────────────
function SkeletonBox({ width = '100%', height = 14, style = {} }: {
  width?:  string | number
  height?: number
  style?:  React.CSSProperties
}) {
  return (
    <div style={{
      width, height,
      background:   'var(--bg3)',
      borderRadius: 6,
      animation:    'skeletonPulse 1.4s ease-in-out infinite',
      ...style,
    }} />
  )
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderLeft: '3px solid var(--bg3)', borderRadius: 10,
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBox width="55%" height={13} />
        <SkeletonBox width={38} height={13} />
      </div>
      <SkeletonBox height={5} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <SkeletonBox height={18} />
            <SkeletonBox height={10} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function StatsByLocationScreen({ stats, loading, onBack, onRefresh }: Props) {
  const totalAll      = stats.reduce((s, l) => s + l.total,   0)
  const totalFound    = stats.reduce((s, l) => s + l.found,   0)
  const totalPending  = stats.reduce((s, l) => s + l.pending, 0)
  const totalProgress = totalAll > 0 ? Math.round((totalFound / totalAll) * 100) : 0

  return (
    <div>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1;   }
        }
      `}</style>

      {/* Шапка */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }}
          onClick={onBack}>← Назад</button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <div className="page-title">Прогресс по кабинетам</div>
          <div className="page-subtitle">
            {loading ? 'Загрузка...' : `${stats.length} кабинетов · ${totalPending} не проверено`}
          </div>
        </div>
        <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }}
          onClick={onRefresh} disabled={loading}>
          {loading ? '...' : '🔄'}
        </button>
      </div>

      {loading && stats.length === 0 ? (
        // ── Скелетон ──────────────────────────────────────────────────────────
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Сводная статистика — скелетон */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <SkeletonBox width="50%" height={20} />
                <SkeletonBox width="70%" height={10} />
              </div>
            ))}
          </div>
          {/* Поиск — скелетон */}
          <SkeletonBox height={40} style={{ borderRadius: 8, marginBottom: 4 }} />
          {/* Карточки — скелетон */}
          {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : stats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Нет данных</div>
      ) : (
        <SummaryAndList
          stats={stats}
          totalAll={totalAll}
          totalFound={totalFound}
          totalPending={totalPending}
          totalProgress={totalProgress}
        />
      )}
    </div>
  )
}

// ── Сводная статистика + список кабинетов ─────────────────────────────────────
function SummaryAndList({ stats, totalAll, totalFound, totalPending, totalProgress }: {
  stats:         LocationStat[]
  totalAll:      number
  totalFound:    number
  totalPending:  number
  totalProgress: number
}) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? stats.filter(s => s.locationName.toLowerCase().includes(search.toLowerCase()))
    : stats

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Сводная статистика */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 4 }}>
        {([
          { label: 'Всего',        value: totalAll,            color: 'var(--text2)'   },
          { label: 'Найдено',      value: totalFound,          color: 'var(--accent2)' },
          { label: 'Не проверено', value: totalPending,        color: 'var(--text2)'   },
          { label: 'Прогресс',     value: `${totalProgress}%`, color: totalProgress === 100 ? 'var(--accent2)' : 'var(--accent)' },
        ]).map(s => (
          <div key={s.label} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 8px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 18, color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Поиск по кабинетам */}
      <input
        className="input"
        style={{ marginBottom: 4 }}
        placeholder="🔍 Поиск по кабинету..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Список */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Ничего не найдено</div>
      ) : filtered.map(loc => (
        <LocationCard key={loc.locationId} loc={loc} />
      ))}
    </div>
  )
}

// ── Карточка кабинета ─────────────────────────────────────────────────────────
function LocationCard({ loc }: { loc: LocationStat }) {
  const [expanded, setExpanded] = useState<ExpandedType>(null)
  const [search,   setSearch]   = useState('')

  const color = progressColor(loc.progress)

  const cells: {
    key:      ExpandedType
    label:    string
    value:    number
    color:    string
    assets:   AssetInfo[]
  }[] = [
    { key: 'total',     label: 'Всего',        value: loc.total,     color: 'var(--text2)',   assets: loc.totalAssets     },
    { key: 'found',     label: 'Найдено',       value: loc.found,     color: 'var(--accent2)', assets: loc.foundAssets     },
    { key: 'notFound',  label: 'Не найдено',    value: loc.notFound,  color: 'var(--danger)',  assets: loc.notFoundAssets  },
    { key: 'misplaced', label: 'Не на месте',   value: loc.misplaced, color: 'var(--warn)',    assets: loc.misplacedAssets },
    { key: 'pending',   label: 'Не проверено',  value: loc.pending,   color: loc.pending > 0 ? 'var(--text1)' : 'var(--text3)', assets: loc.pendingAssets },
  ]

  const currentAssets = cells.find(c => c.key === expanded)?.assets ?? []
  const filteredAssets = search.trim()
    ? currentAssets.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.inventoryNumber.toLowerCase().includes(search.toLowerCase()) ||
        (a.barcode ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.responsiblePerson ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.employee ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.scannedBy ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : currentAssets

  const expandedLabel = cells.find(c => c.key === expanded)?.label ?? ''
  const showScanInfo  = expanded === 'found' || expanded === 'misplaced'

  const handleCell = (key: ExpandedType, count: number) => {
    if (count === 0) return
    if (expanded === key) { setExpanded(null); setSearch('') }
    else                  { setExpanded(key);  setSearch('') }
  }

  return (
    <div style={{
      background:   'var(--bg2)',
      border:       '1px solid var(--border)',
      borderLeft:   `3px solid ${color}`,
      borderRadius: 10,
      overflow:     'hidden',
      opacity:      loc.progress === 100 ? 0.6 : 1,
      transition:   'opacity 0.2s',
    }}>
      <div style={{ padding: '12px 14px' }}>

        {/* Заголовок */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 8, marginBottom: 8,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 500,
            color: loc.progress === 100 ? 'var(--text3)' : 'var(--text1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {loc.progress === 100 ? '✅ ' : '📍 '}{loc.locationName}
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>
            {loc.progress}%
          </span>
        </div>

        {/* Прогресс-бар */}
        <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%', borderRadius: 3, background: color,
            width: `${loc.progress}%`, transition: 'width 0.4s ease',
          }} />
        </div>

        {/* 5 ячеек */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {cells.map(cell => (
            <div
              key={cell.key}
              onClick={() => handleCell(cell.key, cell.value)}
              style={{
                background:   expanded === cell.key ? 'var(--bg1)' : 'var(--bg3)',
                border:       cell.value > 0
                  ? `1px solid ${expanded === cell.key ? 'var(--accent)' : 'var(--border)'}`
                  : '1px solid transparent',
                borderRadius: 6, padding: '6px 4px', textAlign: 'center',
                cursor:       cell.value > 0 ? 'pointer' : 'default',
                opacity:      cell.value === 0 ? 0.4 : 1,
                transition:   'background 0.15s, border-color 0.15s',
                userSelect:   'none',
              }}
            >
              <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 14, color: cell.color }}>
                {cell.value}
                {cell.value > 0 && (
                  <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.6 }}>
                    {expanded === cell.key ? '▲' : '▼'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1, lineHeight: 1.2 }}>
                {cell.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Раскрытый список */}
      {expanded && (
        <AssetList
          title={`${expandedLabel}: ${currentAssets.length}`}
          assets={filteredAssets}
          search={search}
          onSearch={v => setSearch(v)}
          onClose={() => { setExpanded(null); setSearch('') }}
          showScanInfo={showScanInfo}
        />
      )}
    </div>
  )
}

// ── Список активов ────────────────────────────────────────────────────────────
function AssetList({ title, assets, search, onSearch, onClose, showScanInfo }: {
  title:        string
  assets:       AssetInfo[]
  search:       string
  onSearch:     (v: string) => void
  onClose:      () => void
  showScanInfo: boolean
}) {
  const fmtDate = (d: string | null) => {
    if (!d) return null
    return new Date(d).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg1)',
      padding: '10px 14px 14px',
    }}>
      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>{title}</span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text3)', fontSize: 16, padding: '0 4px', lineHeight: 1,
        }}>✕</button>
      </div>

      {/* Поиск */}
      <input
        type="text"
        className="input"
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8, fontSize: 12 }}
        placeholder="Поиск по названию, инв. номеру, штрих-коду, МОЛ, сотруднику..."
        value={search}
        onChange={e => onSearch(e.target.value)}
      />

      {/* Список */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
        {assets.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>
            Ничего не найдено
          </div>
        ) : assets.map((a, i) => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '8px 10px', background: 'var(--bg2)',
            borderRadius: 6, border: '1px solid var(--border)',
          }}>
            {/* Номер */}
            <span style={{
              fontFamily: 'IBM Plex Mono', fontSize: 11,
              color: 'var(--text3)', flexShrink: 0, minWidth: 22, textAlign: 'right', paddingTop: 1,
            }}>
              {i + 1}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Название */}
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'var(--text1)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4,
              }}>
                {a.name}
              </div>

              {/* Коды */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                <span style={badgeStyle}>инв: {a.inventoryNumber}</span>
                {a.barcode
                  ? <span style={badgeStyle}>🔍 {a.barcode}</span>
                  : <span style={{ ...badgeStyle, opacity: 0.4 }}>нет штрих-кода</span>
                }
              </div>

              {/* МОЛ + сотрудник */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: showScanInfo && (a.scannedAt || a.scannedBy || a.note) ? 6 : 0 }}>
                {a.responsiblePerson && (
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>👤 {a.responsiblePerson}</span>
                )}
                {a.employee && (
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>🧑‍💼 {a.employee}</span>
                )}
              </div>

              {/* Данные сканирования — только для найденных и не на месте */}
              {showScanInfo && (a.scannedAt || a.scannedBy || a.note) && (
                <div style={{
                  background: 'var(--bg3)', borderRadius: 6,
                  padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  {a.scannedBy && (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>🔍 {a.scannedBy}</span>
                  )}
                  {a.scannedAt && (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>🕐 {fmtDate(a.scannedAt)}</span>
                  )}
                  {a.note && (
                    <span style={{ fontSize: 11, color: 'var(--warn)' }}>📝 {a.note}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Общий стиль бейджа ────────────────────────────────────────────────────────
const badgeStyle: React.CSSProperties = {
  fontFamily:   'IBM Plex Mono',
  fontSize:     10,
  color:        'var(--text3)',
  background:   'var(--bg3)',
  borderRadius: 4,
  padding:      '1px 6px',
}