import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

import type { Session, ScanResult, Location, Employee, HistoryEntry, AssetItem, LocationStat } from '../components/inventory-session/types'
import ScannerBlock          from '../components/inventory-session/ScannerBlock'
import ScanResultCard        from '../components/inventory-session/ScanResult'
import ItemsList             from '../components/inventory-session/ItemsList'
import RelocateModal         from '../components/inventory-session/RelocateModal'
import HistoryScreen         from '../components/inventory-session/HistoryScreen'
import StatsByLocationScreen from '../components/inventory-session/StatsByLocationScreen'

export default function InventorySessionPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  // ── Session ───────────────────────────────────────────────────────────────────
  const [session,  setSession]  = useState<Session | null>(null)
  const [loading,  setLoading]  = useState(true)

  // ── Scanner ───────────────────────────────────────────────────────────────────
  const [scannerActive, setScannerActive] = useState(false)
  const [lastScan,      setLastScan]      = useState<ScanResult | null>(null)
  const [manualInput,   setManualInput]   = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [scannedBy,     setScannedBy]     = useState(() => localStorage.getItem('scannedBy') || '')
  const [scannedCount,  setScannedCount]  = useState(0)

  // ── History ───────────────────────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false)
  const [history,     setHistory]     = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`scan-history-${id}`)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  // ── Stats by location ─────────────────────────────────────────────────────────
  const [showStatsByLocation, setShowStatsByLocation] = useState(false)
  const [statsByLocation,     setStatsByLocation]     = useState<LocationStat[]>([])
  const [statsLoading,        setStatsLoading]        = useState(false)

  // ── Actions ───────────────────────────────────────────────────────────────────
  const [finishing,     setFinishing]     = useState(false)
  const [relocatingAll, setRelocatingAll] = useState(false)
  const [addingAssets,  setAddingAssets]  = useState(false)
  const [cancelling,    setCancelling]    = useState<number | null>(null)
  const [showMenu,      setShowMenu]      = useState(false)

  // ── Reference data ────────────────────────────────────────────────────────────
  const [locations, setLocations] = useState<Location[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [persons,   setPersons]   = useState<Employee[]>([])

  // ── Relocate modal ────────────────────────────────────────────────────────────
  const [relocateItem, setRelocateItem] = useState<AssetItem | null>(null)

  const manualRef = useRef<HTMLInputElement>(null)

  // ── Data loading ──────────────────────────────────────────────────────────────
  const fetchSession = useCallback(async () => {
    try {
      const res = await api.get(`/inventory/${id}`)
      setSession(res.data)
    } catch {
      alert('Не удалось загрузить сессию. Проверьте подключение к серверу.')
    } finally { setLoading(false) }
  }, [id])

  const fetchStatsByLocation = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await api.get(`/inventory/${id}/stats/by-location`)
      setStatsByLocation(res.data)
    } catch {
      alert('Не удалось загрузить статистику по кабинетам')
    } finally { setStatsLoading(false) }
  }, [id])

  useEffect(() => { fetchSession() }, [fetchSession])

  useEffect(() => {
    api.get('/locations').then(r => setLocations(r.data)).catch(() => {})
    api.get('/locations/employees').then(r => setEmployees(r.data)).catch(() => {})
    api.get('/locations/responsible-persons').then(r => setPersons(r.data)).catch(() => {})
  }, [])

  // Закрыть меню при клике снаружи
  useEffect(() => {
    if (!showMenu) return
    const handler = () => setShowMenu(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showMenu])

  // ── History helpers ───────────────────────────────────────────────────────────
  const addToHistory = (barcode: string, status: string, name: string) => {
    setHistory(prev => {
      const next = [{
        id:   Date.now().toString(),
        barcode, status, name,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }, ...prev].slice(0, 50)
      localStorage.setItem(`scan-history-${id}`, JSON.stringify(next))
      return next
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(`scan-history-${id}`)
  }

  // ── Scan ──────────────────────────────────────────────────────────────────────
  const doScan = async (barcode: string) => {
    if (!barcode.trim()) return
    setSubmitting(true)
    try {
      const res = await api.post(`/inventory/${id}/scan`, {
        barcode:   barcode.trim(),
        scannedBy: scannedBy.trim() || undefined,
      })
      const data = res.data

      if (data.alreadyScanned) {
        setLastScan({ asset: data.asset, status: 'found', previousScan: data.previousScan ?? null })
        addToHistory(barcode, 'ALREADY', data.asset?.name || barcode)
        return
      }

      const status = (data.status === 'MISPLACED' || data.isWrongLocation) ? 'misplaced' : 'found'
      setLastScan({ asset: data.asset, status, note: data.item?.note })
      setScannedCount(c => c + 1)
      addToHistory(barcode, status === 'misplaced' ? 'MISPLACED' : 'FOUND', data.asset?.name || barcode)
      fetchSession()
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } }
      if (err.response?.status === 404) {
        setLastScan({ asset: { name: 'Не найдено', inventoryNumber: barcode }, status: 'not-found' })
        addToHistory(barcode, 'NOT_FOUND', barcode)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleManualScan = () => {
    if (!manualInput.trim() || submitting) return
    doScan(manualInput.trim())
    setManualInput('')
  }

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScannerActive(true)
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const url    = URL.createObjectURL(file)
      const img    = new Image()
      img.onload   = async () => {
        try {
          const result = await reader.decodeFromImageElement(img)
          doScan(result.getText())
          if (navigator.vibrate) navigator.vibrate(80)
        } catch {
          alert('Штрих-код не распознан. Попробуйте ещё раз.')
        } finally {
          URL.revokeObjectURL(url)
          setScannerActive(false)
          e.target.value = ''
        }
      }
      img.src = url
    } catch { setScannerActive(false) }
  }

  // ── Session actions ───────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!confirm('Завершить инвентаризацию? Все непроверенные ОС будут помечены как "Не найдены"')) return
    setFinishing(true)
    try { await api.patch(`/inventory/${id}/finish`); fetchSession() }
    finally { setFinishing(false) }
  }

  const handleRelocateAll = async () => {
    if (!session?.locationId) { alert('Сессия не привязана к конкретному кабинету.'); return }
    if (!confirm(`Переместить все ${session.stats.misplaced} ОС в "${session.location?.name}"?`)) return
    setRelocatingAll(true)
    try { await api.patch(`/inventory/${id}/relocate-all`, {}); fetchSession(); setLastScan(null) }
    catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'Ошибка')
    }
    finally { setRelocatingAll(false) }
  }

  const handleAddAssets = async () => {
    if (!confirm('Добавить новые ОС которые появились после создания сессии?')) return
    setAddingAssets(true)
    try {
      const res = await api.post(`/inventory/${id}/add-assets`)
      if (res.data.added === 0) {
        alert('Новых ОС нет — все уже в сессии')
      } else {
        alert(`✅ Добавлено ${res.data.added} новых ОС`)
        fetchSession()
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'Ошибка')
    } finally {
      setAddingAssets(false)
    }
  }

  const handleExport = async () => {
    try {
      const res  = await api.get(`/inventory/${id}/export`, { responseType: 'blob' })
      const url  = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      link.href     = url
      link.download = `inventory_${id}_${date}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Ошибка при экспорте')
    }
  }

  const handleCancelScan = async (itemId: number) => {
    if (!confirm('Отменить сканирование? ОС вернётся в статус "Не проверен"')) return
    setCancelling(itemId)
    try { await api.patch(`/inventory/${id}/item/${itemId}/cancel`); fetchSession() }
    catch { alert('Не удалось отменить') }
    finally { setCancelling(null) }
  }

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (loading) return <div className="loading">Загрузка...</div>
  if (!session) return <div className="empty"><div>Сессия не найдена</div></div>

  const progress = session.stats.total > 0
    ? Math.round(((session.stats.found + session.stats.notFound + session.stats.misplaced) / session.stats.total) * 100)
    : 0
  const isActive = session.status === 'IN_PROGRESS'

  // ── Вложенные экраны ──────────────────────────────────────────────────────────
  if (showHistory) return (
    <HistoryScreen
      history={history}
      onBack={() => setShowHistory(false)}
      onClear={clearHistory}
    />
  )

  if (showStatsByLocation) return (
    <StatsByLocationScreen
      stats={statsByLocation}
      loading={statsLoading}
      onBack={() => setShowStatsByLocation(false)}
      onRefresh={fetchStatsByLocation}
    />
  )

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`
        @keyframes scanPop {
          0%   { transform: scale(0.97); opacity: 0.7; }
          100% { transform: scale(1);    opacity: 1;   }
        }
        .sort-th { cursor: pointer; user-select: none; transition: background 0.15s; }
        .sort-th:hover { background: var(--bg3) !important; }
        .action-menu {
          position: absolute; top: 100%; right: 0; margin-top: 4px;
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 10px; padding: 6px; min-width: 200px;
          z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .action-menu button {
          width: 100%; text-align: left; padding: 10px 12px;
          background: none; border: none; cursor: pointer;
          color: var(--text1); font-size: 13px; border-radius: 6px;
          display: flex; align-items: center; gap: 8px;
        }
        .action-menu button:hover { background: var(--bg3); }
        .action-menu button:disabled { opacity: 0.4; cursor: not-allowed; }
        .action-menu .divider { height: 1px; background: var(--border); margin: 4px 0; }
      `}</style>

      {/* ── Шапка ── */}
      <div className="page-header" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button className="btn btn-outline"
            style={{ marginBottom: 6, fontSize: 12, padding: '4px 10px' }}
            onClick={() => navigate('/inventory')}>
            ← Назад
          </button>
          <div className="page-title" style={{ fontSize: 'clamp(15px, 4vw, 22px)', lineHeight: 1.2 }}>
            {session.name}
          </div>
          <div className="page-subtitle" style={{ fontSize: 12, marginTop: 4 }}>
            {session.location && <span>📍 {session.location.name} · </span>}
            {session.createdBy && <span>👤 {session.createdBy} · </span>}
            <span style={{
              color: isActive ? 'var(--accent)'
                : session.status === 'CLOSED' ? '#94a3b8'
                : session.status === 'CANCELLED' ? 'var(--danger)'
                : 'var(--accent2)'
            }}>
              {isActive ? '🔵 В процессе'
                : session.status === 'CLOSED' ? '🔒 Закрыт'
                : session.status === 'CANCELLED' ? '❌ Отменён'
                : '✅ Завершён'}
            </span>
            {scannedCount > 0 && (
              <span style={{ color: 'var(--accent2)' }}> · ✅ {scannedCount} в этой сессии</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>

          {/* История */}
          <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }}
            onClick={() => setShowHistory(true)}>
            🕐 {history.length > 0 ? history.length : ''}
          </button>

          {/* Статистика по кабинетам */}
          <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }}
            onClick={() => { setShowStatsByLocation(true); fetchStatsByLocation() }}>
            🏢
          </button>

          {/* Desktop кнопки */}
          <div className="desktop-only" style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }}
              onClick={() => navigate(`/inventory/${id}/relocations`)}>
              📦 {session.stats.misplaced > 0 ? `Перемещения (${session.stats.misplaced})` : 'Перемещения'}
            </button>
            {isActive && (
              <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }}
                onClick={handleAddAssets} disabled={addingAssets}>
                {addingAssets ? '...' : '➕ Обновить список'}
              </button>
            )}
            <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }}
              onClick={handleExport}>
              📥 Экспорт
            </button>
            {isActive && (
              <button className="btn btn-danger" style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={handleFinish} disabled={finishing}>
                {finishing ? '...' : '🏁 Завершить'}
              </button>
            )}
          </div>

          {/* Mobile меню */}
          <div className="mobile-only" style={{ position: 'relative' }}>
            {isActive && (
              <button className="btn btn-danger" style={{ fontSize: 12, padding: '6px 12px', marginRight: 6 }}
                onClick={handleFinish} disabled={finishing}>
                {finishing ? '...' : '🏁'}
              </button>
            )}
            <button className="btn btn-outline" style={{ fontSize: 16, padding: '6px 12px' }}
              onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}>
              ⋯
            </button>
            {showMenu && (
              <div className="action-menu" onClick={e => e.stopPropagation()}>
                <button onClick={() => { navigate(`/inventory/${id}/relocations`); setShowMenu(false) }}>
                  📦 Перемещения {session.stats.misplaced > 0 && `(${session.stats.misplaced})`}
                </button>
                {isActive && (
                  <button onClick={() => { handleAddAssets(); setShowMenu(false) }} disabled={addingAssets}>
                    ➕ Обновить список ОС
                  </button>
                )}
                <button onClick={() => { handleExport(); setShowMenu(false) }}>
                  📥 Экспорт в Excel
                </button>
                <div className="divider" />
                <button onClick={() => { setShowHistory(true); setShowMenu(false) }}>
                  🕐 История сканирования
                </button>
                <button onClick={() => { setShowStatsByLocation(true); fetchStatsByLocation(); setShowMenu(false) }}>
                  🏢 Прогресс по кабинетам
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Статистика ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 14 }}>
        {([
          { label: 'Всего',    value: session.stats.total,     color: 'var(--text)'    },
          { label: 'Найдено',  value: session.stats.found,     color: 'var(--accent2)' },
          { label: 'Нет',      value: session.stats.notFound,  color: 'var(--danger)'  },
          { label: '⚠️ Место', value: session.stats.misplaced, color: 'var(--warn)'    },
          { label: 'Осталось', value: session.stats.pending,   color: 'var(--text3)'   },
        ] as const).map(s => (
          <div key={s.label} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '8px 4px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 'clamp(14px, 4vw, 22px)', color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, lineHeight: 1.2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Прогресс ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>
          <span>Прогресс</span>
          <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 600, color: progress === 100 ? 'var(--accent2)' : 'var(--text)' }}>
            {progress}%
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: progress === 100 ? 'var(--accent2)' : 'var(--accent)',
            width: `${progress}%`, transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
          <span>✅ {session.stats.found} найдено</span>
          <span>⚠️ {session.stats.misplaced} не на месте</span>
          <span>❌ {session.stats.notFound} не найдено</span>
        </div>
      </div>

      {/* ── Баннер "не на месте" ── */}
      {isActive && session.stats.misplaced > 0 && (
        <div style={{
          marginBottom: 14, padding: '12px 14px',
          background: '#451a0322', border: '1px solid var(--warn)',
          borderRadius: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontWeight: 600, color: 'var(--warn)', fontSize: 13 }}>
            ⚠️ {session.stats.misplaced} ОС не на своём месте
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }}
              onClick={() => navigate(`/inventory/${id}/relocations`)}>
              Посмотреть
            </button>
            {session.locationId && (
              <button className="btn"
                style={{ background: 'var(--warn)', color: '#000', fontWeight: 600, fontSize: 12, padding: '6px 12px' }}
                onClick={handleRelocateAll} disabled={relocatingAll}>
                {relocatingAll ? '...' : '✏️ Переместить все сюда'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Сканер ── */}
      {isActive && (
        <ScannerBlock
          scannedBy={scannedBy}
          onScannedByChange={val => { setScannedBy(val); localStorage.setItem('scannedBy', val) }}
          manualInput={manualInput}
          onManualInputChange={setManualInput}
          onManualScan={handleManualScan}
          onCameraCapture={handleCameraCapture}
          submitting={submitting}
          scannerActive={scannerActive}
        />
      )}

      {/* ── Результат сканирования ── */}
      {lastScan && (
        <ScanResultCard
          lastScan={lastScan}
          scannedBy={scannedBy}
          session={session}
          cancelling={cancelling}
          onNext={() => setLastScan(null)}
          onNextManual={() => { setLastScan(null); setTimeout(() => manualRef.current?.focus(), 100) }}
          onRelocate={setRelocateItem}
          onCancelScan={handleCancelScan}
        />
      )}

      {/* ── Список ОС ── */}
      <ItemsList
        items={session.items}
        total={session.stats.total}
        isActive={isActive}
        cancelling={cancelling}
        locations={locations}
        persons={persons}
        employees={employees}
        onRelocate={setRelocateItem}
        onCancelScan={handleCancelScan}
      />

      {/* ── Модалка перемещения ── */}
      {relocateItem && (
        <RelocateModal
          item={relocateItem}
          locations={locations}
          employees={employees}
          onClose={() => setRelocateItem(null)}
          onConfirm={async (params) => {
            const assetId = relocateItem.asset.id
            if (!assetId) return
            await api.patch(`/inventory/${id}/asset/${assetId}/location`, params)
            setRelocateItem(null)
            fetchSession()
          }}
        />
      )}
    </div>
  )
}