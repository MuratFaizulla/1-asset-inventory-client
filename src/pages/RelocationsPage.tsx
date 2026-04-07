import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Copy, Check, Barcode } from 'lucide-react'
import api, { API_BASE } from '../api/client'

interface RelocatedItem {
  id: number
  note: string | null
  scannedAt: string | null
  checkedAt: string | null
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

type VerifyStatus = 'done' | 'not-done' | 'wrong' | 'not-found'
type SortKey = 'idx' | 'name' | 'date' | 'verify' | 'checked'
type FilterKey = 'all' | 'done' | 'not-done' | 'wrong' | 'not-found' | 'unchecked' | 'checked'

function parseNote(note: string | null) {
  if (!note) return { location: null, employee: null, comment: null }

  let location: string | null = null
  let employee: string | null = null
  let comment: string | null = null

  const locMatch = note.match(/Перемещён в (?:"([^"]+)"|([^,]+))/)
  if (locMatch) location = (locMatch[1] || locMatch[2] || '').trim()

  const empMatch = note.match(/Передан сотруднику ([^,]+)/)
  if (empMatch) employee = empMatch[1].trim()

  const commentMatch = note.match(/Комментарий:\s*(.+)/)
  if (commentMatch) comment = commentMatch[1].trim()

  if (!location && !employee && !comment) comment = note

  return { location, employee, comment }
}

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

// Сравнение имён с учётом сокращённых форм (1С часто хранит без отчества)
function nameMatches(a: string, b: string): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  return na === nb || na.startsWith(nb + ' ') || nb.startsWith(na + ' ') || na.startsWith(nb) || nb.startsWith(na)
}

function fallbackCopy(text: string, done: () => void) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  try { document.execCommand('copy'); done() } catch { /* ignore */ }
  document.body.removeChild(ta)
}

export default function RelocationsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [items, setItems]             = useState<RelocatedItem[]>([])
  const [sessionName, setSessionName] = useState('')
  const [loading, setLoading]         = useState(true)
  const [exporting, setExporting]     = useState(false)
  const [togglingId, setTogglingId]   = useState<number | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [copiedKey, setCopiedKey]     = useState<string | null>(null)

  // ── Верификация по Excel из 1С ──────────────────────────────────
  // Map: инвентарный номер → местонахождение в загруженном Excel
  const [verifyMap, setVerifyMap]         = useState<Map<string, string> | null>(null)
  const [verifyEmpMap, setVerifyEmpMap]   = useState<Map<string, string> | null>(null)
  const [verifyFileName, setVerifyFileName] = useState<string | null>(null)
  const [verifying, setVerifying]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Поиск, сортировка, фильтр ──────────────────────────────────
  const [search, setSearch]       = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey]     = useState<SortKey>('idx')
  const [sortDir, setSortDir]     = useState<1 | -1>(1)
  const [filter, setFilter]       = useState<FilterKey>('all')

  // ── Загрузка данных ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [sessionRes, relocRes] = await Promise.all([
          api.get(`/inventory/${id}`),
          api.get(`/inventory/${id}/relocated`),
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

  // ── Хелперы ──────────────────────────────────────────────────────
  const toggleChecked = useCallback(async (itemId: number) => {
    setTogglingId(itemId)
    try {
      const res = await api.patch(`/inventory/${id}/item/${itemId}/check`)
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, checkedAt: res.data.checkedAt } : item
      ))
    } catch (e) {
      console.error(e)
    } finally {
      setTogglingId(null)
    }
  }, [id])

  // Авто-отметить все позиции у которых verifyStatus === 'done'
  const autoMarkVerified = useCallback(async (getStatus: (i: RelocatedItem) => VerifyStatus | null) => {
    const targets = items.filter(i => !i.checkedAt && getStatus(i) === 'done')
    if (!targets.length) return
    setBulkLoading(true)
    try {
      await Promise.all(
        targets.map(item =>
          api.patch(`/inventory/${id}/item/${item.id}/check`)
            .then(res => {
              setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, checkedAt: res.data.checkedAt } : i
              ))
            })
        )
      )
    } finally {
      setBulkLoading(false)
    }
  }, [id, items])

  // Экспорт только неотмеченных позиций (клиентский XLSX)
  const exportUnchecked = useCallback((fmtD: (d: string | null) => string) => {
    const unchecked = items.filter(i => !i.checkedAt)
    if (!unchecked.length) return

    const rows = unchecked.map((item, idx) => {
      const parsed = parseNote(item.note)
      return {
        '№':                    idx + 1,
        'Инвентарный номер':    item.asset.inventoryNumber,
        'Наименование':         item.asset.name,
        'МОЛ':                  item.asset.responsiblePerson.fullName,
        'По данным 1С':         item.asset.location.name,
        'Новое местонахождение': parsed.location ?? '',
        'Сотрудник (1С)':       item.asset.employee?.fullName ?? '',
        'Новый сотрудник →':    parsed.employee ?? '',
        'Комментарий':          parsed.comment ?? '',
        'Дата':                 fmtD(item.scannedAt),
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Остаток')
    XLSX.writeFile(wb, `relocations-остаток-${id}.xlsx`)
  }, [id, items])

  // Копировать текст в буфер обмена (key — уникальный ключ для иконки ✓)
  const copyText = useCallback((key: string, text: string) => {
    const done = () => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    } else {
      fallbackCopy(text, done)
    }
  }, [])

  const getVerifyStatus = useCallback((item: RelocatedItem): VerifyStatus | null => {
    if (!verifyMap) return null
    const parsed = parseNote(item.note)
    if (!parsed.location && !parsed.employee) return null
    if (!parsed.location && !verifyEmpMap) return null

    // Check file presence using location map (primary)
    if (parsed.location) {
      const locIn1C = verifyMap.get(item.asset.inventoryNumber)
      if (locIn1C === undefined) return 'not-found'
    }

    const statuses: Array<'done' | 'not-done' | 'wrong'> = []

    if (parsed.location) {
      const locIn1C = verifyMap.get(item.asset.inventoryNumber)!
      if (normalize(locIn1C) === normalize(parsed.location)) {
        statuses.push('done')
      } else if (normalize(locIn1C) === normalize(item.asset.location.name)) {
        statuses.push('not-done') // не изменено совсем
      } else {
        statuses.push('wrong')   // изменено, но не туда
      }
    }

    if (parsed.employee && verifyEmpMap) {
      const empIn1C = verifyEmpMap.get(item.asset.inventoryNumber)
      if (empIn1C !== undefined) {
        if (nameMatches(empIn1C, parsed.employee)) {
          statuses.push('done')
        } else if (nameMatches(empIn1C, item.asset.employee?.fullName ?? '')) {
          statuses.push('not-done')
        } else {
          statuses.push('wrong')
        }
      }
    }

    if (statuses.length === 0) return null
    if (statuses.includes('wrong'))    return 'wrong'
    if (statuses.includes('not-done')) return 'not-done'
    return 'done'
  }, [verifyMap, verifyEmpMap])

  // ── Загрузка Excel из 1С для проверки ──────────────────────────
  const EMPLOYEE_COLS = ['Подотчетное лицо', 'Сотрудник', 'МОЛ', 'Ответственный', 'Ответственное лицо']

  const handleVerifyFile = (file: File) => {
    setVerifying(true)
    setVerifyFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows  = XLSX.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[]

        const locMap = new Map<string, string>()
        const empMap = new Map<string, string>()
        let empColFound = false

        for (const row of rows) {
          const inv = row['Инвентарный номер'] != null ? String(row['Инвентарный номер']).trim() : null
          const loc = row['Местонахождение']   != null ? String(row['Местонахождение']).trim()   : ''
          if (!inv) continue
          locMap.set(inv, loc)

          // Ищем колонку сотрудника
          for (const col of EMPLOYEE_COLS) {
            if (row[col] != null) {
              empMap.set(inv, String(row[col]).trim())
              empColFound = true
              break
            }
          }
        }

        setVerifyMap(locMap)
        setVerifyEmpMap(empColFound ? empMap : null)
        // Авто-сортировка по статусу чтобы проблемы были сверху
        setSortKey('verify')
        setSortDir(1)
      } catch {
        alert('Не удалось прочитать файл. Убедитесь, что это корректный Excel-файл.')
        setVerifyFileName(null)
      } finally {
        setVerifying(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleVerifyFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleVerifyFile(file)
  }

  // ── Сортировка/фильтр ────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 1 ? -1 : 1)
    else { setSortKey(key); setSortDir(1) }
  }

  const verifyOrder: Record<string, number> = { 'wrong': 0, 'not-done': 1, 'not-found': 2, 'done': 3 }

  const q = search.toLowerCase().trim()

  const processedItems = [...items]
    .filter(item => {
      if (q) {
        const inName = item.asset.name.toLowerCase().includes(q)
        const inInv  = item.asset.inventoryNumber.toLowerCase().includes(q)
        const inBar  = item.asset.barcode?.toLowerCase().includes(q) ?? false
        if (!inName && !inInv && !inBar) return false
      }
      if (filter === 'all') return true
      if (filter === 'checked')   return !!item.checkedAt
      if (filter === 'unchecked') return !item.checkedAt
      const vs = getVerifyStatus(item)
      return vs === filter
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'idx') {
        cmp = items.indexOf(a) - items.indexOf(b)
      } else if (sortKey === 'name') {
        cmp = a.asset.name.localeCompare(b.asset.name, 'ru')
      } else if (sortKey === 'date') {
        cmp = (a.scannedAt ?? '').localeCompare(b.scannedAt ?? '')
      } else if (sortKey === 'verify') {
        const va = verifyOrder[getVerifyStatus(a) ?? 'done'] ?? 2
        const vb = verifyOrder[getVerifyStatus(b) ?? 'done'] ?? 2
        cmp = va - vb
      } else if (sortKey === 'checked') {
        cmp = (!!a.checkedAt ? 1 : 0) - (!!b.checkedAt ? 1 : 0)
      }
      return cmp * sortDir
    })

  // ── Статистика верификации ────────────────────────────────────────
  const verifyStats = verifyMap ? {
    done:     items.filter(i => getVerifyStatus(i) === 'done').length,
    notDone:  items.filter(i => getVerifyStatus(i) === 'not-done').length,
    wrong:    items.filter(i => getVerifyStatus(i) === 'wrong').length,
    notFound: items.filter(i => getVerifyStatus(i) === 'not-found').length,
  } : null

  const checkedCount = items.filter(i => !!i.checkedAt).length

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div>
      {/* ── Шапка ─────────────────────────────────────────────── */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <button
            onClick={(e) => {
              e.preventDefault()
              setExporting(true)
              const a = document.createElement('a')
              a.href = `${API_BASE}/api/inventory/${id}/export-relocated`
              a.download = ''
              a.click()
              setTimeout(() => setExporting(false), 1500)
            }}
            disabled={exporting || items.length === 0}
            style={{
              background: exporting ? 'var(--bg3)' : '#1a3a2a',
              border: '1px solid #2d6a45',
              color: exporting ? 'var(--text3)' : '#4ade80',
              borderRadius: 10, padding: '10px 16px',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, minHeight: 44, whiteSpace: 'nowrap',
            }}
          >
            {exporting ? '⏳' : '📥 Excel для 1С'}
          </button>
          {items.some(i => !i.checkedAt) && (
            <button
              onClick={() => exportUnchecked(fmtDate)}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                color: 'var(--text2)', borderRadius: 10, padding: '6px 14px',
                cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >
              📥 Только остаток ({items.filter(i => !i.checkedAt).length})
            </button>
          )}
        </div>
      </div>

      {/* ── Прогресс-бар ──────────────────────────────────────────── */}
      {items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
              Отмечено в 1С: {checkedCount} из {items.length}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: checkedCount === items.length ? 'var(--accent2)' : 'var(--text3)' }}>
              {Math.round((checkedCount / items.length) * 100)}%
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(checkedCount / items.length) * 100}%`,
              background: checkedCount === items.length ? 'var(--accent2)' : 'var(--accent)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

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
          {/* ── Инструкция — скрывается после загрузки файла ──────── */}
          {!verifyMap && (
            <div style={{
              marginBottom: 12, padding: '12px 16px',
              background: '#1e3a5f22', border: '1px solid var(--accent)',
              borderRadius: 12,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}>
                📋 Как обновить в 1С
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
                1. Скачайте Excel — кнопка "📥 Excel для 1С"<br />
                2. В 1С откройте каждый ОС по инвентарному номеру<br />
                3. Измените поле "Местонахождение" на значение из колонки "Новое местонахождение"<br />
                4. Выгрузите обновлённый список ОС из 1С и загрузите ниже для проверки
              </div>
            </div>
          )}

          {/* ── Блок проверки по Excel из 1С ─────────────────────── */}
          <div style={{
            marginBottom: 16, padding: '14px 16px',
            background: '#0f1f0f', border: `1px solid ${verifyMap ? '#2d6a45' : 'var(--border)'}`,
            borderRadius: 12,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, color: verifyMap ? 'var(--accent2)' : 'var(--text2)' }}>
              🔍 Проверка по выгрузке из 1С
            </div>

            {/* Зона загрузки */}
            <div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1px dashed var(--border)', borderRadius: 10,
                padding: '14px 18px', cursor: 'pointer', marginBottom: 10,
                background: 'var(--bg2)', textAlign: 'center',
                transition: 'border-color 0.2s',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={onFileChange}
              />
              {verifying ? (
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>⏳ Читаю файл...</span>
              ) : verifyFileName ? (
                <span style={{ fontSize: 13, color: 'var(--accent2)' }}>
                  ✅ Загружен: <strong>{verifyFileName}</strong> — нажмите чтобы заменить
                </span>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                  📂 Перетащите Excel из 1С сюда или нажмите для выбора
                </span>
              )}
            </div>

            {/* Статистика верификации */}
            {verifyStats && (() => {
              const total = verifyStats.done + verifyStats.notDone + verifyStats.wrong + verifyStats.notFound
              const allDone = verifyStats.done === total && total > 0
              const autoMarkCount = items.filter(i => !i.checkedAt && getVerifyStatus(i) === 'done').length
              return (
                <>
                  {/* Баннер успеха */}
                  {allDone && (
                    <div style={{
                      background: '#052e16', border: '1px solid #16a34a',
                      borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                      color: '#4ade80', fontWeight: 700, fontSize: 13, textAlign: 'center',
                    }}>
                      🎉 Все перемещения обновлены в 1С!
                    </div>
                  )}

                  {/* Прогресс */}
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                    Обновлено в 1С:{' '}
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>{verifyStats.done}</span>
                    {' '}из{' '}
                    <span style={{ fontWeight: 700, color: 'var(--text2)' }}>{total}</span>
                    {total > 0 && (
                      <span style={{ marginLeft: 6, color: allDone ? '#4ade80' : 'var(--text3)' }}>
                        ({Math.round((verifyStats.done / total) * 100)}%)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {verifyStats.notDone > 0 && (
                      <span style={{ color: '#f87171', fontWeight: 600, fontSize: 13 }}>❌ Не изменено: {verifyStats.notDone}</span>
                    )}
                    {verifyStats.wrong > 0 && (
                      <span style={{ color: '#fb923c', fontWeight: 600, fontSize: 13 }}>⚠️ Неправильно: {verifyStats.wrong}</span>
                    )}
                    {verifyStats.done > 0 && (
                      <span style={{ color: '#4ade80', fontWeight: 600, fontSize: 13 }}>✅ Изменено: {verifyStats.done}</span>
                    )}
                    {verifyStats.notFound > 0 && (
                      <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 13 }}>❓ Нет в файле: {verifyStats.notFound}</span>
                    )}
                    {autoMarkCount > 0 && (
                      <button
                        onClick={() => autoMarkVerified(getVerifyStatus)}
                        disabled={bulkLoading}
                        style={{
                          background: '#1a3a2a', border: '1px solid #2d6a45',
                          color: '#4ade80', borderRadius: 8, padding: '5px 12px',
                          cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          opacity: bulkLoading ? 0.6 : 1,
                        }}
                      >
                        {bulkLoading ? '⏳...' : `✅ Отметить все изменённые (${autoMarkCount})`}
                      </button>
                    )}
                  </div>
                </>
              )
            })()}

            {!verifyMap && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                После загрузки файла — каждая строка будет сравнена с "Новым местонахождением" по инвентарному номеру
              </div>
            )}
          </div>

          {/* ── Поиск + кнопка Фильтры ───────────────────────────── */}
          {(() => {
            const activeCount = (filter !== 'all' ? 1 : 0) + (sortKey !== 'idx' ? 1 : 0)
            const hasSearch   = !!search || filter !== 'all' || sortKey !== 'idx'
            return (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    className="input"
                    style={{ flex: 1, minHeight: 44 }}
                    placeholder="🔍 Поиск по названию, инв. номеру..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <button
                    className={`btn ${showFilters || activeCount > 0 ? 'btn-primary' : 'btn-outline'}`}
                    style={{ minHeight: 44, padding: '0 14px', fontSize: 13, flexShrink: 0, position: 'relative' }}
                    onClick={() => setShowFilters(v => !v)}
                  >
                    ⚙️ Фильтры
                    {activeCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -6, right: -6,
                        background: 'var(--danger)', color: '#fff',
                        borderRadius: '50%', width: 18, height: 18,
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{activeCount}</span>
                    )}
                  </button>
                  {hasSearch && (
                    <button
                      className="btn btn-outline"
                      style={{ minHeight: 44, padding: '0 12px', fontSize: 13, flexShrink: 0 }}
                      onClick={() => { setSearch(''); setFilter('all'); setSortKey('idx'); setSortDir(1) }}
                    >✕</button>
                  )}
                </div>

                {showFilters && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 12,
                    marginBottom: 12, padding: 14,
                    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
                  }}>
                    {/* Сортировка */}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Сортировка
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {([
                          ['idx',     'По порядку'],
                          ['name',    'По наименованию'],
                          ['date',    'По дате'],
                          ['checked', 'По отметке'],
                          ...(verifyMap ? [['verify', 'По статусу 1С']] : []),
                        ] as [SortKey, string][]).map(([key, label]) => (
                          <button key={key} onClick={() => toggleSort(key)}
                            style={{
                              background: sortKey === key ? 'var(--accent)' : 'var(--bg3)',
                              border: `1px solid ${sortKey === key ? 'var(--accent)' : 'var(--border)'}`,
                              color: sortKey === key ? '#000' : 'var(--text2)',
                              borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            }}
                          >
                            {label}{sortKey === key ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Фильтр */}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Фильтр
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setFilter('all')}
                          style={{
                            background: filter === 'all' ? 'var(--accent)' : 'var(--bg3)',
                            border: `1px solid ${filter === 'all' ? 'var(--accent)' : 'var(--border)'}`,
                            color: filter === 'all' ? '#000' : 'var(--text2)',
                            borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          }}>Все ({items.length})</button>
                        <button onClick={() => setFilter(filter === 'unchecked' ? 'all' : 'unchecked')}
                          style={{
                            background: filter === 'unchecked' ? '#1e3a5f' : 'var(--bg3)',
                            border: `1px solid ${filter === 'unchecked' ? 'var(--accent)' : 'var(--border)'}`,
                            color: filter === 'unchecked' ? 'var(--accent)' : 'var(--text2)',
                            borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          }}>☐ Не отмечено ({items.length - checkedCount})</button>
                        <button onClick={() => setFilter(filter === 'checked' ? 'all' : 'checked')}
                          style={{
                            background: filter === 'checked' ? '#1a3a2a' : 'var(--bg3)',
                            border: `1px solid ${filter === 'checked' ? '#2d6a45' : 'var(--border)'}`,
                            color: filter === 'checked' ? 'var(--accent2)' : 'var(--text2)',
                            borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          }}>✅ Отмечено ({checkedCount})</button>
                        {verifyMap && <>
                          <button onClick={() => setFilter(filter === 'not-done' ? 'all' : 'not-done')}
                            style={{
                              background: filter === 'not-done' ? '#450a0a' : 'var(--bg3)',
                              border: `1px solid ${filter === 'not-done' ? '#dc2626' : 'var(--border)'}`,
                              color: filter === 'not-done' ? '#f87171' : 'var(--text2)',
                              borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            }}>❌ Не изменено ({verifyStats?.notDone ?? 0})</button>
                          <button onClick={() => setFilter(filter === 'wrong' ? 'all' : 'wrong')}
                            style={{
                              background: filter === 'wrong' ? '#431407' : 'var(--bg3)',
                              border: `1px solid ${filter === 'wrong' ? '#ea580c' : 'var(--border)'}`,
                              color: filter === 'wrong' ? '#fb923c' : 'var(--text2)',
                              borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            }}>⚠️ Неправильно ({verifyStats?.wrong ?? 0})</button>
                          <button onClick={() => setFilter(filter === 'done' ? 'all' : 'done')}
                            style={{
                              background: filter === 'done' ? '#052e16' : 'var(--bg3)',
                              border: `1px solid ${filter === 'done' ? '#16a34a' : 'var(--border)'}`,
                              color: filter === 'done' ? '#4ade80' : 'var(--text2)',
                              borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            }}>✅ Изменено ({verifyStats?.done ?? 0})</button>
                          {(verifyStats?.notFound ?? 0) > 0 && (
                            <button onClick={() => setFilter(filter === 'not-found' ? 'all' : 'not-found')}
                              style={{
                                background: filter === 'not-found' ? '#1c1a04' : 'var(--bg3)',
                                border: `1px solid ${filter === 'not-found' ? '#ca8a04' : 'var(--border)'}`,
                                color: filter === 'not-found' ? '#fbbf24' : 'var(--text2)',
                                borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              }}>❓ Нет в файле ({verifyStats?.notFound ?? 0})</button>
                          )}
                        </>}
                      </div>
                    </div>

                    {processedItems.length !== items.length && (
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        Показано: {processedItems.length} из {items.length}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}

          {/* ── Мобиль — карточки ─────────────────────────────────── */}
          <div className="mobile-only" style={{ flexDirection: 'column', gap: 8 }}>
            {processedItems.map(item => {
              const parsed   = parseNote(item.note)
              const vs       = getVerifyStatus(item)
              const isChecked = !!item.checkedAt

              return (
                <div key={item.id} style={{
                  background: isChecked ? '#0a1a0a' : 'var(--bg2)',
                  border: `1px solid ${
                    vs === 'done'      ? '#16a34a' :
                    vs === 'wrong'     ? '#ea580c' :
                    vs === 'not-done'  ? '#dc2626' :
                    vs === 'not-found' ? '#ca8a04' :
                    isChecked          ? '#2d6a45' : 'var(--border)'
                  }`,
                  borderRadius: 12, padding: '12px 14px', position: 'relative',
                }}>
                  {/* Отметка и статус */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button
                        onClick={() => toggleChecked(item.id)}
                        disabled={togglingId === item.id}
                        style={{
                          background: isChecked ? '#16a34a' : 'var(--bg3)',
                          border: `1px solid ${isChecked ? '#16a34a' : 'var(--border)'}`,
                          color: isChecked ? '#fff' : 'var(--text3)',
                          borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                          opacity: togglingId === item.id ? 0.6 : 1,
                        }}
                      >
                        {togglingId === item.id ? '⏳' : isChecked ? '✅ Сделано' : '☐ Отметить'}
                      </button>
                      {isChecked && item.checkedAt && (
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                          {fmtDate(item.checkedAt)}
                        </span>
                      )}
                    </div>
                    {vs && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: vs === 'done' ? '#052e16' : vs === 'wrong' ? '#431407' : vs === 'not-done' ? '#450a0a' : '#1c1a04',
                        color:      vs === 'done' ? '#4ade80' : vs === 'wrong' ? '#fb923c' : vs === 'not-done' ? '#f87171' : '#fbbf24',
                        border:     `1px solid ${vs === 'done' ? '#16a34a' : vs === 'wrong' ? '#ea580c' : vs === 'not-done' ? '#dc2626' : '#ca8a04'}`,
                      }}>
                        {vs === 'done' ? '✅ Изменено' : vs === 'wrong' ? '⚠️ Неправильно' : vs === 'not-done' ? '❌ Не изменено' : '❓ Нет в файле'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>
                    {item.asset.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                    {/* Инв. номер */}
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {item.asset.inventoryNumber}
                    </span>
                    <button
                      onClick={() => copyText(`inv-${item.id}`, item.asset.inventoryNumber)}
                      title="Копировать инв. номер"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: copiedKey === `inv-${item.id}` ? 'var(--accent2)' : 'var(--text3)' }}
                    >
                      {copiedKey === `inv-${item.id}` ? <Check size={13} /> : <Copy size={13} />}
                    </button>

                    {/* Штрих-код */}
                    {item.asset.barcode && (
                      <>
                        <span style={{ opacity: 0.3, fontSize: 10 }}>|</span>
                        <Barcode size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {item.asset.barcode}
                        </span>
                        <button
                          onClick={() => copyText(`bar-${item.id}`, item.asset.barcode!)}
                          title="Копировать штрих-код"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: copiedKey === `bar-${item.id}` ? 'var(--accent2)' : 'var(--text3)' }}
                        >
                          {copiedKey === `bar-${item.id}` ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                    📍 По 1С: <span style={{ color: 'var(--text2)' }}>{item.asset.location.name}</span>
                  </div>

                  {parsed.location && (
                    <div style={{
                      background: '#064e3b22', border: '1px solid #064e3b66',
                      borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>ПЕРЕМЕСТИТЬ В →</div>
                      <div style={{ fontWeight: 600, color: 'var(--accent2)', fontSize: 13 }}>
                        📍 {parsed.location}
                      </div>
                      {/* Показываем что в загруженном файле */}
                      {verifyMap && (vs === 'not-done' || vs === 'wrong') && (
                        <div style={{ fontSize: 11, color: vs === 'wrong' ? '#fb923c' : '#f87171', marginTop: 4 }}>
                          В файле 1С сейчас: "{verifyMap.get(item.asset.inventoryNumber) || '—'}"
                          {vs === 'wrong' && <span style={{ marginLeft: 4, opacity: 0.7 }}>(≠ нужное)</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {(item.asset.employee || parsed.employee) && (
                    <div style={{
                      background: '#0c1a2a', border: '1px solid #1e3a5f',
                      borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                    }}>
                      {item.asset.employee && (
                        <div style={{ marginBottom: parsed.employee ? 6 : 0 }}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>СОТРУДНИК В 1С</div>
                          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                            🧑‍💼 {item.asset.employee.fullName}
                          </div>
                        </div>
                      )}
                      {parsed.employee && (() => {
                        const empIn1C = verifyEmpMap?.get(item.asset.inventoryNumber)
                        const empOk = empIn1C !== undefined && nameMatches(empIn1C, parsed.employee)
                        const empWrong = empIn1C !== undefined && !empOk && !nameMatches(empIn1C, item.asset.employee?.fullName ?? '')
                        return (
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>ПЕРЕДАТЬ СОТРУДНИКУ →</div>
                            <div style={{ fontWeight: 600, color: empOk ? '#4ade80' : 'var(--accent)', fontSize: 13 }}>
                              🧑‍💼 {parsed.employee}
                            </div>
                            {empIn1C && !empOk && (
                              <div style={{ fontSize: 11, color: empWrong ? '#fb923c' : '#f87171', marginTop: 3 }}>
                                В 1С сейчас: "{empIn1C}"{empWrong && <span style={{ marginLeft: 4, opacity: 0.7 }}>(≠ нужное)</span>}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {parsed.comment && (
                    <div style={{
                      background: '#1a1200', border: '1px solid #451a03',
                      borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>КОММЕНТАРИЙ</div>
                      <div style={{ color: 'var(--warn)', fontSize: 13 }}>✏️ {parsed.comment}</div>
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

          {/* ── Десктоп — таблица ─────────────────────────────────── */}
          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>#</th>
                  <th style={{ width: 48, textAlign: 'center' }}>
                    <span title="Поставьте галочку когда изменили в 1С">✅</span>
                  </th>
                  {verifyMap && (
                    <th style={{ width: 110, fontSize: 11 }}>Статус в 1С</th>
                  )}
                  <th>Инв. номер</th>
                  <th>Наименование</th>
                  <th>МОЛ</th>
                  <th>По данным 1С</th>
                  <th>Переместить в →</th>
                  <th style={{ color: 'var(--text3)' }}>Сотрудник (1С)</th>
                  <th>Новый сотрудник →</th>
                  <th>Комментарий</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {processedItems.map((item, idx) => {
                  const parsed    = parseNote(item.note)
                  const vs        = getVerifyStatus(item)
                  const isChecked = !!item.checkedAt

                  return (
                    <tr key={item.id} style={{
                      background: isChecked ? '#0a1a0a' : undefined,
                      opacity: isChecked && !verifyMap ? 0.75 : 1,
                    }}>
                      <td style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}>
                        {idx + 1}
                      </td>

                      {/* Галочка */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <button
                            onClick={() => toggleChecked(item.id)}
                            disabled={togglingId === item.id}
                            title={isChecked ? `Снять отметку (поставлена ${fmtDate(item.checkedAt)})` : 'Отметить как сделано'}
                            style={{
                              background: isChecked ? '#16a34a' : 'var(--bg3)',
                              border: `1px solid ${isChecked ? '#16a34a' : 'var(--border)'}`,
                              color: isChecked ? '#fff' : 'var(--text3)',
                              borderRadius: 6, width: 30, height: 28,
                              cursor: togglingId === item.id ? 'wait' : 'pointer',
                              fontSize: 14, lineHeight: 1,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              opacity: togglingId === item.id ? 0.5 : 1,
                            }}
                          >
                            {togglingId === item.id ? '⏳' : isChecked ? '✓' : '○'}
                          </button>
                          {isChecked && item.checkedAt && (
                            <span style={{ fontSize: 9, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                              {fmtDate(item.checkedAt)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Статус проверки */}
                      {verifyMap && (
                        <td>
                          {vs === 'done' && (
                            <span style={{
                              background: '#052e16', color: '#4ade80',
                              border: '1px solid #16a34a',
                              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                            }}>✅ Изменено</span>
                          )}
                          {vs === 'not-done' && (
                            <div>
                              <span style={{
                                background: '#450a0a', color: '#f87171',
                                border: '1px solid #dc2626',
                                padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                display: 'block', marginBottom: 3,
                              }}>❌ Не изменено</span>
                              <span style={{ fontSize: 10, color: '#f87171', opacity: 0.8 }}>
                                Сейчас: "{verifyMap.get(item.asset.inventoryNumber) || '—'}"
                              </span>
                            </div>
                          )}
                          {vs === 'wrong' && (
                            <div>
                              <span style={{
                                background: '#431407', color: '#fb923c',
                                border: '1px solid #ea580c',
                                padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                display: 'block', marginBottom: 3,
                              }}>⚠️ Неправильно</span>
                              <span style={{ fontSize: 10, color: '#fb923c', opacity: 0.8 }}>
                                Сейчас: "{verifyMap.get(item.asset.inventoryNumber) || '—'}"
                              </span>
                            </div>
                          )}
                          {vs === 'not-found' && (
                            <span style={{
                              background: '#1c1a04', color: '#fbbf24',
                              border: '1px solid #ca8a04',
                              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                            }}>❓ Нет в файле</span>
                          )}
                          {vs === null && (
                            <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      )}

                      <td>
                        {/* Инв. номер */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: item.asset.barcode ? 4 : 0 }}>
                          <span className="mono" style={{ fontSize: 12 }}>{item.asset.inventoryNumber}</span>
                          <button
                            onClick={() => copyText(`inv-${item.id}`, item.asset.inventoryNumber)}
                            title="Копировать инв. номер"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: copiedKey === `inv-${item.id}` ? 'var(--accent2)' : 'var(--text3)' }}
                          >
                            {copiedKey === `inv-${item.id}` ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                        {/* Штрих-код */}
                        {item.asset.barcode && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Barcode size={12} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                            <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{item.asset.barcode}</span>
                            <button
                              onClick={() => copyText(`bar-${item.id}`, item.asset.barcode!)}
                              title="Копировать штрих-код"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: copiedKey === `bar-${item.id}` ? 'var(--accent2)' : 'var(--text3)' }}
                            >
                              {copiedKey === `bar-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}
                      </td>
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
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {item.asset.employee?.fullName ?? '—'}
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

          {processedItems.length === 0 && (
            <div className="empty" style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Нет записей по выбранному фильтру</div>
            </div>
          )}
        </>
      )}
    </div>
  )
  
}
