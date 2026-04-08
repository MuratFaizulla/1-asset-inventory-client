import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import api, { API_BASE } from '../api/client'

interface CollectionItemLog {
  id: number
  action: 'RETURNED' | 'DAMAGED' | 'LOST' | 'CANCELLED'
  performedBy: string | null
  note: string | null
  createdAt: string
}

interface CollectionItem {
  id: number
  status: 'PENDING' | 'RETURNED' | 'DAMAGED' | 'LOST'
  returnedAt: string | null
  returnedBy: string | null
  note: string | null
  logs: CollectionItemLog[]
  asset: {
    id: number
    inventoryNumber: string
    name: string
    barcode: string | null
    assetType: string
    location: { id: number; name: string }
    employee: { id: number; fullName: string } | null
    responsiblePerson: { fullName: string }
  }
}

interface CollectionSession {
  id: number
  name: string
  assetType: string | null
  deadline: string | null
  status: 'OPEN' | 'CLOSED'
  createdAt: string
  createdBy: string | null
  note: string | null
  items: CollectionItem[]
  stats: { total: number; returned: number; damaged: number; lost: number; pending: number }
}

type ViewTab = 'pending' | 'returned' | 'all'

interface LocationGroup {
  location: string
  items: CollectionItem[]
  returned: number
  damaged: number
  lost: number
  pending: number
}

function statusBadge(status: CollectionItem['status']) {
  if (status === 'RETURNED') return { label: '✅ Сдал',      bg: '#052e16', color: '#4ade80', border: '#16a34a' }
  if (status === 'DAMAGED')  return { label: '⚠️ Повреждён', bg: '#431407', color: '#fb923c', border: '#ea580c' }
  if (status === 'LOST')     return { label: '🔴 Утерян',    bg: '#3b0764', color: '#c084fc', border: '#9333ea' }
  return                            { label: '❌ Не сдал',   bg: '#450a0a', color: '#f87171', border: '#dc2626' }
}

function logActionLabel(action: CollectionItemLog['action']) {
  if (action === 'RETURNED')  return { label: '✅ Принято',    color: '#4ade80' }
  if (action === 'DAMAGED')   return { label: '⚠️ Повреждён',  color: '#fb923c' }
  if (action === 'LOST')      return { label: '🔴 Утерян',     color: '#c084fc' }
  if (action === 'CANCELLED') return { label: '↩️ Отменено',   color: '#94a3b8' }
  return { label: action, color: 'var(--text3)' }
}

export default function CollectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [session, setSession]     = useState<CollectionSession | null>(null)
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<ViewTab>('pending')
  const [search, setSearch]       = useState('')
  const [closing, setClosing]     = useState(false)
  const [exporting, setExporting] = useState<'full' | 'pending' | 'damaged' | null>(null)
  const [expandedLocs, setExpandedLocs] = useState<Set<string>>(new Set())
  const [locFilter, setLocFilter]       = useState<string>('')
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())

  // Массовое принятие
  const [bulkAccepting, setBulkAccepting] = useState<string | null>(null)  // location name
  const [bulkModal, setBulkModal] = useState<string | null>(null)  // location name for modal
  const [bulkCode, setBulkCode]   = useState('')
  const [bulkError, setBulkError] = useState<string | null>(null)

  // Клонирование
  const [cloning, setCloning] = useState(false)

  // Удаление сессии
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteCode, setDeleteCode]           = useState('')
  const [deleting, setDeleting]               = useState(false)
  const [deleteError, setDeleteError]         = useState<string | null>(null)

  // Открыть снова
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [reopenCode, setReopenCode]           = useState('')
  const [reopenError, setReopenError]         = useState<string | null>(null)
  const [reopening, setReopening]             = useState(false)

  // Редактирование сессии
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm]           = useState({ name: '', deadline: '', note: '', createdBy: '' })
  const [saving, setSaving]               = useState(false)

  // Список должников (копирование)
  const [copied, setCopied]               = useState(false)

  // QR-код
  const [showQrModal, setShowQrModal]     = useState(false)
  const [qrDataUrl, setQrDataUrl]         = useState<string | null>(null)

  // Отмена скана с кодом
  const [cancellingId, setCancellingId]       = useState<number | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTargetId, setCancelTargetId]   = useState<number | null>(null)
  const [cancelCode, setCancelCode]           = useState('')
  const [cancelError, setCancelError]         = useState<string | null>(null)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)

  // Scanner
  const [barcode, setBarcode]       = useState('')
  const [returnedBy, setReturnedBy] = useState(() => localStorage.getItem('collection-returnedBy') || '')
  const [scanning, setScanning]     = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [scanResult, setScanResult] = useState<{
    item: CollectionItem
    action: 'RETURNED' | 'DAMAGED' | 'LOST'
    alreadyScanned: boolean
    previousStatus?: string
  } | null>(null)
  const [scanError, setScanError]       = useState<string | null>(null)
  const [scanErrorType, setScanErrorType] = useState<'default' | 'not-in-session'>('default')
  const barcodeRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/collection/${id}`)
      setSession(res.data)
      // По умолчанию все кабинеты свёрнуты
      setExpandedLocs(new Set())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleReopen = async () => {
    if (!reopenCode.trim()) return
    setReopening(true)
    setReopenError(null)
    try {
      await api.patch(`/collection/${id}/reopen`, { code: reopenCode.trim() })
      setSession(prev => prev ? { ...prev, status: 'OPEN' } : prev)
      setShowReopenModal(false)
      setReopenCode('')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setReopenError(msg ?? 'Неверный код')
    } finally {
      setReopening(false)
    }
  }

  // ── Редактирование ───────────────────────────────────────────────────────────
  const openEditModal = () => {
    if (!session) return
    setEditForm({
      name:      session.name,
      deadline:  session.deadline
        ? new Date(session.deadline).toISOString().slice(0, 16)
        : '',
      note:      session.note      || '',
      createdBy: session.createdBy || '',
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return
    setSaving(true)
    try {
      const res = await api.patch(`/collection/${id}`, {
        name:      editForm.name.trim(),
        deadline:  editForm.deadline  || null,
        note:      editForm.note.trim()      || null,
        createdBy: editForm.createdBy.trim() || null,
      })
      setSession(prev => prev ? { ...prev, ...res.data } : prev)
      setShowEditModal(false)
    } catch {
      alert('Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  // ── Список должников (копирование) ───────────────────────────────────────────
  const copyDebtors = () => {
    if (!session) return
    const pending = session.items.filter(i => i.status === 'PENDING')
    if (pending.length === 0) return

    // Группируем по кабинету
    const byLoc = new Map<string, typeof pending>()
    for (const item of pending) {
      const loc = item.asset.location?.name || 'Без кабинета'
      if (!byLoc.has(loc)) byLoc.set(loc, [])
      byLoc.get(loc)!.push(item)
    }

    const deadline = session.deadline
      ? new Date(session.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
      : null

    const lines: string[] = [
      `📋 ${session.name}`,
      deadline ? `📅 Срок сдачи: ${deadline}` : '',
      '',
      `❌ Не сдали (${pending.length} чел.):`,
      '',
    ].filter(l => l !== undefined) as string[]

    Array.from(byLoc.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'ru'))
      .forEach(([loc, items]) => {
        lines.push(`📍 ${loc}:`)
        items
          .sort((a, b) => (a.asset.employee?.fullName || '').localeCompare(b.asset.employee?.fullName || '', 'ru'))
          .forEach(item => {
            const emp = item.asset.employee?.fullName || '—'
            lines.push(`  • ${emp} — ${item.asset.name} (${item.asset.inventoryNumber})`)
          })
        lines.push('')
      })

    const text = lines.join('\n')
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // ── QR-код ───────────────────────────────────────────────────────────────────
  const openQrModal = async () => {
    setShowQrModal(true)
    if (qrDataUrl) return
    const url = `${window.location.origin}/collection/${id}`
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280, margin: 2,
        color: { dark: '#e2e8f0', light: '#161b27' },
      })
      setQrDataUrl(dataUrl)
    } catch (e) { console.error(e) }
  }

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCameraActive(true)
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const url    = URL.createObjectURL(file)
      const img    = new Image()
      img.onload = async () => {
        try {
          const result = await reader.decodeFromImageElement(img)
          setBarcode(result.getText())
          if (navigator.vibrate) navigator.vibrate(80)
        } catch {
          alert('Штрих-код не распознан. Попробуйте ещё раз.')
        } finally {
          URL.revokeObjectURL(url)
          setCameraActive(false)
          e.target.value = ''
        }
      }
      img.src = url
    } catch { setCameraActive(false) }
  }

  const handleScan = async (status: 'RETURNED' | 'DAMAGED' | 'LOST') => {
    const b = barcode.trim()
    if (!b || scanning) return
    setScanning(true)
    setScanError(null)
    setScanResult(null)
    setScanErrorType('default')
    try {
      const res = await api.post(`/collection/${id}/scan`, {
        barcode: b, status,
        returnedBy: returnedBy.trim() || undefined,
      })
      const { item, alreadyScanned, previousStatus } = res.data
      setScanResult({ item, action: status, alreadyScanned, previousStatus })
      setBarcode('')

      if (!alreadyScanned) {
        setSession(prev => {
          if (!prev) return prev
          const updated = prev.items.map(i => i.id === item.id ? item : i)
          return {
            ...prev,
            items: updated,
            stats: {
              total:    prev.stats.total,
              returned: updated.filter(i => i.status === 'RETURNED').length,
              damaged:  updated.filter(i => i.status === 'DAMAGED').length,
              lost:     updated.filter(i => i.status === 'LOST').length,
              pending:  updated.filter(i => i.status === 'PENDING').length,
            }
          }
        })
      }
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { error?: string; notInSession?: boolean } } })?.response?.data
      setScanError(data?.error ?? 'Штрих-код не найден в этой сессии')
      setScanErrorType(data?.notInSession ? 'not-in-session' : 'default')
    } finally {
      setScanning(false)
      setTimeout(() => barcodeRef.current?.focus(), 100)
    }
  }

  const handleClose = async () => {
    if (!confirm('Закрыть сессию? После закрытия сканирование будет недоступно.')) return
    setClosing(true)
    try {
      await api.patch(`/collection/${id}/close`)
      setSession(prev => prev ? { ...prev, status: 'CLOSED' } : prev)
    } catch {
      alert('Не удалось закрыть сессию')
    } finally {
      setClosing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteCode.trim()) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/collection/${id}`, { data: { code: deleteCode.trim() } })
      navigate('/collection')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setDeleteError(msg ?? 'Ошибка удаления')
    } finally {
      setDeleting(false)
    }
  }

  const openCancelModal = (itemId: number) => {
    setCancelTargetId(itemId)
    setCancelCode('')
    setCancelError(null)
    setShowCancelModal(true)
  }

  const handleCancelItem = async () => {
    if (!cancelTargetId || !cancelCode.trim()) return
    setCancelSubmitting(true)
    setCancelError(null)
    setCancellingId(cancelTargetId)
    try {
      const res = await api.patch(`/collection/${id}/item/${cancelTargetId}/cancel`, { code: cancelCode.trim() })
      setSession(prev => {
        if (!prev) return prev
        const updated = prev.items.map(i => i.id === cancelTargetId ? res.data : i)
        return {
          ...prev,
          items: updated,
          stats: {
            total:    prev.stats.total,
            returned: updated.filter(i => i.status === 'RETURNED').length,
            damaged:  updated.filter(i => i.status === 'DAMAGED').length,
            lost:     updated.filter(i => i.status === 'LOST').length,
            pending:  updated.filter(i => i.status === 'PENDING').length,
          }
        }
      })
      setShowCancelModal(false)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setCancelError(msg ?? 'Неверный код')
    } finally {
      setCancelSubmitting(false)
      setCancellingId(null)
    }
  }

  const handleExport = (type: 'full' | 'pending' | 'damaged') => {
    setExporting(type)
    const path = type === 'full' ? 'export' : type === 'pending' ? 'export-pending' : 'export-damaged'
    const a = document.createElement('a')
    a.href = `${API_BASE}/api/collection/${id}/${path}`
    a.download = ''
    a.click()
    setTimeout(() => setExporting(null), 1500)
  }

  const openBulkModal = (locationName: string) => {
    if (!returnedBy.trim()) {
      alert('Укажите "Кто принимает" перед массовым принятием')
      return
    }
    setBulkModal(locationName)
    setBulkCode('')
    setBulkError(null)
  }

  const handleBulkAccept = async () => {
    if (!bulkModal || !bulkCode.trim()) return
    setBulkAccepting(bulkModal)
    setBulkError(null)
    try {
      await api.post(`/collection/${id}/bulk-accept`, {
        locationName: bulkModal,
        returnedBy:   returnedBy.trim(),
        status:       'RETURNED',
        code:         bulkCode.trim(),
      })
      setBulkModal(null)
      await load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setBulkError(msg ?? 'Неверный код')
    } finally {
      setBulkAccepting(null)
    }
  }

  const handleClone = async () => {
    if (!confirm('Клонировать сессию? Будет создана новая сессия с теми же ОС (все статусы сбросятся в "Не сдал").')) return
    setCloning(true)
    try {
      const res = await api.post(`/collection/${id}/clone`)
      navigate(`/collection/${res.data.id}`)
    } catch {
      alert('Не удалось клонировать сессию')
    } finally {
      setCloning(false)
    }
  }

  const toggleLog = (itemId: number) => {
    setExpandedLogs(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const toggleLocation = (loc: string) => {
    setExpandedLocs(prev => {
      const next = new Set(prev)
      if (next.has(loc)) next.delete(loc)
      else next.add(loc)
      return next
    })
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  // Уникальные кабинеты для фильтра
  const allLocations = useMemo(() => {
    if (!session) return []
    const locs = new Set(session.items.map(i => i.asset.location?.name ?? 'Без кабинета'))
    return Array.from(locs).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [session])

  // Группировка по кабинету
  const locationGroups = useMemo((): LocationGroup[] => {
    if (!session) return []
    const q = search.toLowerCase().trim()
    const map = new Map<string, CollectionItem[]>()

    for (const item of session.items) {
      // Фильтр по вкладке
      if (tab === 'pending'  && item.status !== 'PENDING') continue
      if (tab === 'returned' && item.status === 'PENDING') continue

      // Фильтр по кабинету
      const loc = item.asset.location?.name ?? 'Без кабинета'
      if (locFilter && loc !== locFilter) continue

      // Фильтр по поиску
      if (q) {
        const match =
          item.asset.name.toLowerCase().includes(q) ||
          item.asset.inventoryNumber.toLowerCase().includes(q) ||
          (item.asset.barcode?.toLowerCase().includes(q) ?? false) ||
          (item.asset.employee?.fullName.toLowerCase().includes(q) ?? false)
        if (!match) continue
      }

      if (!map.has(loc)) map.set(loc, [])
      map.get(loc)!.push(item)
    }

    return Array.from(map.entries())
      .map(([location, items]) => ({
        location,
        items: items.sort((a, b) =>
          (a.asset.employee?.fullName ?? '').localeCompare(b.asset.employee?.fullName ?? '', 'ru')
        ),
        returned: items.filter(i => i.status === 'RETURNED').length,
        damaged:  items.filter(i => i.status === 'DAMAGED').length,
        lost:     items.filter(i => i.status === 'LOST').length,
        pending:  items.filter(i => i.status === 'PENDING').length,
      }))
      .sort((a, b) => a.location.localeCompare(b.location, 'ru'))
  }, [session, tab, search, locFilter])

  if (loading) return <div className="loading">Загрузка...</div>
  if (!session) return <div className="loading">Сессия не найдена</div>

  const { stats } = session
  const pct = stats.total > 0 ? Math.round(((stats.returned + stats.damaged + stats.lost) / stats.total) * 100) : 0
  const isOverdue = session.status === 'OPEN' && session.deadline && new Date(session.deadline) < new Date()
  const totalFiltered = locationGroups.reduce((s, g) => s + g.items.length, 0)

  return (
    <div>
      {/* ── Шапка ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <button className="btn btn-outline"
            style={{ marginBottom: 8, fontSize: 12, padding: '4px 10px' }}
            onClick={() => navigate('/collection')}>
            ← Назад
          </button>
          <div className="page-title">📥 {session.name}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
              background: session.status === 'CLOSED' ? '#052e16' : '#1e3a5f',
              color:      session.status === 'CLOSED' ? '#4ade80' : 'var(--accent)',
              border:     `1px solid ${session.status === 'CLOSED' ? '#16a34a' : 'var(--accent)'}`,
            }}>
              {session.status === 'CLOSED' ? '✅ Закрыта' : '🟢 Открыта'}
            </span>
            {session.assetType && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>📦 {session.assetType}</span>
            )}
            {session.deadline && (
              <span style={{ fontSize: 12, color: isOverdue ? '#f87171' : 'var(--text3)' }}>
                {isOverdue ? '⚠️' : '📅'} до {fmtDate(session.deadline)}
              </span>
            )}
            {session.createdBy && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>👤 {session.createdBy}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>

          {/* Строка: QR + Редактировать */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={openQrModal}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)',
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>
              📲 QR-код
            </button>
            <button onClick={openEditModal}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)',
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>
              ✏️ Редактировать
            </button>
          </div>

          <button onClick={() => handleExport('full')} disabled={exporting === 'full'}
            style={{
              background: '#1a3a2a', border: '1px solid #2d6a45', color: '#4ade80',
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12,
              fontWeight: 600, whiteSpace: 'nowrap', opacity: exporting === 'full' ? 0.6 : 1,
            }}>
            {exporting === 'full' ? '⏳' : '📥 Ведомость'}
          </button>
          {stats.pending > 0 && (
            <button onClick={() => handleExport('pending')} disabled={exporting === 'pending'}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)',
                borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
                fontWeight: 600, whiteSpace: 'nowrap', opacity: exporting === 'pending' ? 0.6 : 1,
              }}>
              {exporting === 'pending' ? '⏳' : `📋 Должники (${stats.pending})`}
            </button>
          )}
          {stats.damaged > 0 && (
            <button onClick={() => handleExport('damaged')} disabled={exporting === 'damaged'}
              style={{
                background: '#431407', border: '1px solid #ea580c', color: '#fb923c',
                borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
                fontWeight: 600, whiteSpace: 'nowrap', opacity: exporting === 'damaged' ? 0.6 : 1,
              }}>
              {exporting === 'damaged' ? '⏳' : `⚠️ Повреждённые (${stats.damaged})`}
            </button>
          )}
          <button onClick={handleClone} disabled={cloning}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)',
              borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
              fontWeight: 600, whiteSpace: 'nowrap', opacity: cloning ? 0.6 : 1,
            }}>
            {cloning ? '⏳' : '📋 Клонировать'}
          </button>
          {session.status === 'OPEN' && (
            <button onClick={handleClose} disabled={closing}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)',
                borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
                fontWeight: 600, opacity: closing ? 0.6 : 1,
              }}>
              {closing ? '⏳' : '🔒 Закрыть сессию'}
            </button>
          )}
          {session.status === 'CLOSED' && (
            <button
              onClick={() => { setReopenCode(''); setReopenError(null); setShowReopenModal(true) }}
              style={{
                background: '#1e3a5f', border: '1px solid var(--accent)', color: 'var(--accent)',
                borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>
              🔓 Открыть снова
            </button>
          )}
          <button
            onClick={() => { setDeleteCode(''); setDeleteError(null); setShowDeleteModal(true) }}
            style={{
              background: 'var(--bg2)', border: '1px solid #dc2626', color: '#f87171',
              borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}>
            🗑️ Удалить
          </button>
        </div>
      </div>

      {/* ── Статистика ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Всего',      value: stats.total,    color: 'var(--text1)',  bg: 'var(--bg2)' },
          { label: 'Сдали',      value: stats.returned, color: '#4ade80',       bg: '#052e16' },
          { label: 'Повреждено', value: stats.damaged,  color: '#fb923c',       bg: '#431407' },
          { label: 'Утеряно',    value: stats.lost,     color: '#c084fc',       bg: '#3b0764' },
          { label: 'Не сдали',   value: stats.pending,  color: stats.pending > 0 ? '#f87171' : 'var(--text3)', bg: stats.pending > 0 ? '#450a0a' : 'var(--bg2)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{
            background: bg, border: '1px solid var(--border)',
            borderRadius: 12, padding: '10px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Прогресс */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Прогресс сдачи</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#4ade80' : 'var(--text3)' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99, transition: 'width 0.4s ease',
            width: `${pct}%`, background: pct === 100 ? '#16a34a' : 'var(--accent)',
          }} />
        </div>
        {pct === 100 && (
          <div style={{
            marginTop: 8, background: '#052e16', border: '1px solid #16a34a',
            borderRadius: 10, padding: '8px 14px', color: '#4ade80',
            fontWeight: 700, fontSize: 13, textAlign: 'center',
          }}>
            🎉 Все ОС сданы!
          </div>
        )}
      </div>

      {/* ── Кнопка "Скопировать список должников" ── */}
      {stats.pending > 0 && (
        <button
          onClick={copyDebtors}
          style={{
            width: '100%', marginBottom: 14,
            background: copied ? '#052e16' : 'var(--bg2)',
            border: `1px solid ${copied ? '#16a34a' : 'var(--border)'}`,
            color: copied ? '#4ade80' : 'var(--text2)',
            borderRadius: 10, padding: '10px 16px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {copied ? '✅ Скопировано!' : `📋 Скопировать список должников (${stats.pending})`}
        </button>
      )}

      {/* ── Сканер ─────────────────────────────────────────────────── */}
      {session.status === 'OPEN' && (
        <div style={{
          marginBottom: 16, padding: '14px 16px',
          background: '#0f1f0f', border: '1px solid #2d6a45', borderRadius: 12,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent2)', marginBottom: 10 }}>
            📷 Сканировать штрих-код
          </div>

          {/* Поле "Принимает" */}
          <input
            className="input"
            style={{ width: '100%', marginBottom: 8, minHeight: 44 }}
            placeholder="👤 Кто принимает (ФИО)..."
            value={returnedBy}
            onChange={e => {
              setReturnedBy(e.target.value)
              localStorage.setItem('collection-returnedBy', e.target.value)
            }}
          />

          {/* Скрытый input для камеры */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleCameraCapture}
          />

          {/* Кнопка камеры (мобильная) */}
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={cameraActive || scanning}
            style={{
              width: '100%', marginBottom: 8, minHeight: 48,
              background: 'linear-gradient(135deg, #1e3a5f, #0f2540)',
              border: '1px solid #3b82f6', color: 'white',
              borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: cameraActive ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: 24 }}>{cameraActive ? '⏳' : '📷'}</span>
            {cameraActive ? 'Распознаём...' : 'Сканировать камерой'}
          </button>

          {/* Ручной ввод + кнопки */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              ref={barcodeRef}
              className="input"
              style={{ flex: 1, fontFamily: 'IBM Plex Mono', fontSize: 14, minHeight: 44 }}
              placeholder="⌨️ Штрих-код или инв. номер..."
              value={barcode}
              onChange={e => { setBarcode(e.target.value); setScanError(null); setScanResult(null) }}
              onKeyDown={e => { if (e.key === 'Enter' && barcode.trim()) handleScan('RETURNED') }}
              disabled={scanning}
              inputMode="numeric"
            />
          </div>

          <div className="scan-buttons-row" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => handleScan('RETURNED')}
              disabled={!barcode.trim() || scanning}
              style={{
                flex: 1,
                background: barcode.trim() ? '#1a3a2a' : 'var(--bg3)',
                border: `1px solid ${barcode.trim() ? '#2d6a45' : 'var(--border)'}`,
                color: barcode.trim() ? '#4ade80' : 'var(--text3)',
                borderRadius: 10, cursor: barcode.trim() ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700, minHeight: 52,
                opacity: scanning ? 0.6 : 1,
              }}>
              {scanning ? '⏳' : '✅ Принято'}
            </button>
            <button
              onClick={() => handleScan('DAMAGED')}
              disabled={!barcode.trim() || scanning}
              style={{
                flex: 1,
                background: barcode.trim() ? '#431407' : 'var(--bg3)',
                border: `1px solid ${barcode.trim() ? '#ea580c' : 'var(--border)'}`,
                color: barcode.trim() ? '#fb923c' : 'var(--text3)',
                borderRadius: 10, cursor: barcode.trim() ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700, minHeight: 52,
                opacity: scanning ? 0.6 : 1,
              }}>
              ⚠️ Повреждено
            </button>
            <button
              onClick={() => handleScan('LOST')}
              disabled={!barcode.trim() || scanning}
              style={{
                flex: 1,
                background: barcode.trim() ? '#3b0764' : 'var(--bg3)',
                border: `1px solid ${barcode.trim() ? '#9333ea' : 'var(--border)'}`,
                color: barcode.trim() ? '#c084fc' : 'var(--text3)',
                borderRadius: 10, cursor: barcode.trim() ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700, minHeight: 52,
                opacity: scanning ? 0.6 : 1,
              }}>
              🔴 Утерян
            </button>
          </div>

          {/* Результат скана */}
          {scanResult && (
            <div style={{
              background: scanResult.alreadyScanned ? '#1c1a04' :
                          scanResult.action === 'RETURNED' ? '#052e16' :
                          scanResult.action === 'LOST' ? '#3b0764' : '#431407',
              border: `1px solid ${scanResult.alreadyScanned ? '#ca8a04' :
                       scanResult.action === 'RETURNED' ? '#16a34a' :
                       scanResult.action === 'LOST' ? '#9333ea' : '#ea580c'}`,
              borderRadius: 10, padding: '10px 14px',
              color: scanResult.alreadyScanned ? '#fbbf24' :
                     scanResult.action === 'RETURNED' ? '#4ade80' :
                     scanResult.action === 'LOST' ? '#c084fc' : '#fb923c',
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                {scanResult.alreadyScanned
                  ? `⚠️ Уже отмечен как "${scanResult.previousStatus}"`
                  : scanResult.action === 'RETURNED' ? '✅ Принято'
                  : scanResult.action === 'LOST' ? '🔴 Утерян'
                  : '⚠️ Повреждено'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {scanResult.item.asset.name}
                <span style={{ marginLeft: 8, fontFamily: 'IBM Plex Mono', fontSize: 11, opacity: 0.7 }}>
                  {scanResult.item.asset.inventoryNumber}
                </span>
              </div>
              {scanResult.item.asset.employee && (
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                  🧑‍💼 {scanResult.item.asset.employee.fullName}
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>
                    · 📍 {scanResult.item.asset.location.name}
                  </span>
                </div>
              )}
            </div>
          )}

          {scanError && (
            <div style={{
              background: scanErrorType === 'not-in-session' ? '#1c1a04' : '#450a0a',
              border: `1px solid ${scanErrorType === 'not-in-session' ? '#ca8a04' : '#dc2626'}`,
              borderRadius: 10, padding: '10px 14px',
              color: scanErrorType === 'not-in-session' ? '#fbbf24' : '#f87171',
              fontSize: 13, fontWeight: 600,
            }}>
              {scanErrorType === 'not-in-session' ? '⚠️' : '❌'} {scanError}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
            Enter = Принято &nbsp;·&nbsp; Принимает штрих-код или инвентарный номер
          </div>
        </div>
      )}

      {/* ── Вкладки + поиск ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {([
          ['pending',  `❌ Не сдали (${stats.pending})`],
          ['returned', `✅ Сдали (${stats.returned + stats.damaged + stats.lost})`],
          ['all',      `Все (${stats.total})`],
        ] as [ViewTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              background: tab === key ? 'var(--accent)' : 'var(--bg2)',
              border: `1px solid ${tab === key ? 'var(--accent)' : 'var(--border)'}`,
              color: tab === key ? '#000' : 'var(--text2)',
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Фильтр по кабинету + поиск */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select
          className="input"
          style={{ flex: '0 0 auto', maxWidth: 220, fontSize: 13 }}
          value={locFilter}
          onChange={e => setLocFilter(e.target.value)}
        >
          <option value="">🏫 Все кабинеты</option>
          {allLocations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="🔍 Поиск по наименованию, инв. номеру, сотруднику..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {totalFiltered === 0 && (
        <div className="empty" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {stats.total === 0 ? 'В этой сессии нет ОС. Проверьте тип ОС при создании.' : 'Нет записей по выбранному фильтру'}
          </div>
        </div>
      )}

      {/* ── Группы по кабинетам ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {locationGroups.map(group => {
          const isExpanded = expandedLocs.has(group.location)
          const locPct = group.items.length > 0
            ? Math.round(((group.returned + group.damaged + group.lost) / group.items.length) * 100)
            : 0

          return (
            <div key={group.location} style={{
              border: `1px solid ${group.pending === 0 ? '#2d6a45' : 'var(--border)'}`,
              borderRadius: 14, overflow: 'hidden',
              background: group.pending === 0 ? '#05150a' : 'var(--bg2)',
            }}>
              {/* Заголовок кабинета */}
              <div
                onClick={() => toggleLocation(group.location)}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 16 }}>🏫</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{group.location}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                      {group.pending > 0 && (
                        <span style={{ fontSize: 11, color: '#f87171' }}>❌ {group.pending} не сдали</span>
                      )}
                      {group.returned > 0 && (
                        <span style={{ fontSize: 11, color: '#4ade80' }}>✅ {group.returned} сдали</span>
                      )}
                      {group.damaged > 0 && (
                        <span style={{ fontSize: 11, color: '#fb923c' }}>⚠️ {group.damaged} повреждено</span>
                      )}
                      {group.lost > 0 && (
                        <span style={{ fontSize: 11, color: '#c084fc' }}>🔴 {group.lost} утеряно</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {/* Массовое принятие */}
                  {group.pending > 0 && session.status === 'OPEN' && (
                    <button
                      onClick={e => { e.stopPropagation(); openBulkModal(group.location) }}
                      disabled={bulkAccepting === group.location}
                      title="Принять все ожидающие ОС в этом кабинете"
                      style={{
                        background: '#1a3a2a', border: '1px solid #2d6a45', color: '#4ade80',
                        borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11,
                        fontWeight: 600, whiteSpace: 'nowrap',
                        opacity: bulkAccepting === group.location ? 0.6 : 1,
                      }}
                    >
                      {bulkAccepting === group.location ? '⏳' : `✅ Принять всех (${group.pending})`}
                    </button>
                  )}
                  {/* Мини прогресс */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: locPct === 100 ? '#4ade80' : 'var(--text3)' }}>
                      {group.returned + group.damaged + group.lost}/{group.items.length}
                    </div>
                    <div style={{ width: 60, height: 4, background: 'var(--bg3)', borderRadius: 99, marginTop: 3 }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        width: `${locPct}%`,
                        background: locPct === 100 ? '#16a34a' : 'var(--accent)',
                      }} />
                    </div>
                  </div>
                  <span style={{ color: 'var(--text3)', fontSize: 18, lineHeight: 1 }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Список ОС в кабинете */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {group.items.map((item, idx) => {
                    const badge = statusBadge(item.status)
                    return (
                      <div key={item.id}>
                      <div style={{
                        padding: '10px 16px',
                        borderBottom: !expandedLogs.has(item.id) && idx < group.items.length - 1 ? '1px solid var(--bg3)' : undefined,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                            {item.asset.name}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text3)' }}>
                              {item.asset.inventoryNumber}
                            </span>
                            {item.asset.employee && (
                              <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                                🧑‍💼 {item.asset.employee.fullName}
                              </span>
                            )}
                          </div>
                          {item.returnedAt && (
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                              🕐 {fmtDate(item.returnedAt)}
                              {item.returnedBy && ` · ${item.returnedBy}`}
                            </div>
                          )}
                          {item.note && (
                            <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 2 }}>
                              ✏️ {item.note}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                            whiteSpace: 'nowrap',
                            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                          }}>
                            {badge.label}
                          </span>
                          {item.logs.length > 0 && (
                            <button
                              onClick={() => toggleLog(item.id)}
                              title="История действий"
                              style={{
                                background: 'var(--bg3)', border: '1px solid var(--border)',
                                color: 'var(--text3)', borderRadius: 6, padding: '2px 7px',
                                cursor: 'pointer', fontSize: 11,
                              }}
                            >
                              📋 {item.logs.length}
                            </button>
                          )}
                          {item.status !== 'PENDING' && session.status === 'OPEN' && (
                            <button
                              onClick={() => openCancelModal(item.id)}
                              disabled={cancellingId === item.id}
                              title="Отменить сдачу"
                              style={{
                                background: 'var(--bg3)', border: '1px solid var(--border)',
                                color: 'var(--text3)', borderRadius: 6, padding: '2px 8px',
                                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                opacity: cancellingId === item.id ? 0.5 : 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {cancellingId === item.id ? '⏳' : '↩️ Отмена'}
                            </button>
                          )}
                        </div>
                      </div>
                      {/* История действий */}
                      {expandedLogs.has(item.id) && item.logs.length > 0 && (
                        <div style={{
                          padding: '8px 16px',
                          borderBottom: idx < group.items.length - 1 ? '1px solid var(--bg3)' : undefined,
                          background: 'var(--bg1)',
                        }}>
                          {item.logs.map(log => {
                            const { label, color } = logActionLabel(log.action)
                            return (
                              <div key={log.id} style={{
                                display: 'flex', gap: 8, alignItems: 'center',
                                fontSize: 11, padding: '3px 0',
                                borderBottom: '1px solid var(--bg3)',
                              }}>
                                <span style={{ color, fontWeight: 700, flexShrink: 0 }}>{label}</span>
                                <span style={{ color: 'var(--text3)', flexShrink: 0 }}>
                                  {new Date(log.createdAt).toLocaleString('ru-RU', {
                                    day: '2-digit', month: '2-digit',
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </span>
                                {log.performedBy && (
                                  <span style={{ color: 'var(--text2)' }}>· {log.performedBy}</span>
                                )}
                                {log.note && (
                                  <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>· {log.note}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* ── Модал редактирования ─────────────────────────────────── */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">✏️ Редактировать сессию</div>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Название *</label>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Принимает (ФИО)</label>
                <input
                  className="input"
                  placeholder="Кто принимает ОС"
                  value={editForm.createdBy}
                  onChange={e => setEditForm(f => ({ ...f, createdBy: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Дедлайн</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={editForm.deadline}
                  onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Примечание</label>
                <input
                  className="input"
                  placeholder="Необязательно"
                  value={editForm.note}
                  onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)}>Отмена</button>
              <button
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name.trim()}
              >
                {saving ? '⏳ Сохраняю...' : '💾 Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модал QR-кода ─────────────────────────────────────────── */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📲 QR-код сессии</div>
              <button className="modal-close" onClick={() => setShowQrModal(false)}>✕</button>
            </div>

            <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 16 }}>
              Отправьте этот QR сотрудникам — они откроют страницу сдачи ОС
            </div>

            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR код"
                style={{
                  width: 240, height: 240, borderRadius: 12,
                  border: '1px solid var(--border)', display: 'block', margin: '0 auto 16px',
                }}
              />
            ) : (
              <div style={{
                width: 240, height: 240, margin: '0 auto 16px',
                background: 'var(--bg3)', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text3)', fontSize: 13,
              }}>
                ⏳ Генерация...
              </div>
            )}

            <div style={{
              background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px',
              fontSize: 11, color: 'var(--text2)', wordBreak: 'break-all',
              fontFamily: 'IBM Plex Mono', marginBottom: 16, textAlign: 'left',
            }}>
              {window.location.origin}/collection/{id}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  const url = `${window.location.origin}/collection/${id}`
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(url).then(() => {
                      setCopied(true); setTimeout(() => setCopied(false), 2000)
                    })
                  }
                }}
              >
                {copied ? '✅ Скопировано' : '🔗 Скопировать ссылку'}
              </button>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`qr-collection-${id}.png`}
                  className="btn btn-primary"
                >
                  ⬇️ Скачать QR
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Модал открытия снова ─────────────────────────────────── */}
      {showReopenModal && (
        <div className="modal-overlay" onClick={() => setShowReopenModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🔓 Открыть сессию снова</div>
              <button className="modal-close" onClick={() => setShowReopenModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: '#1e3a5f', border: '1px solid var(--accent)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#93c5fd',
              }}>
                ℹ️ После открытия сессии можно снова принимать ОС и отменять сдачу.
              </div>

              <div>
                <label className="label">Код подтверждения</label>
                <input
                  className="input"
                  placeholder="Введите 6-значный код..."
                  value={reopenCode}
                  onChange={e => { setReopenCode(e.target.value.toUpperCase()); setReopenError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleReopen()}
                  maxLength={6}
                  autoFocus
                  style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  Код находится по адресу:{' '}
                  <code style={{ color: 'var(--accent)', fontSize: 11 }}>/api/collection/code</code>
                  {' '}· Меняется каждые 8 часов
                </div>
              </div>

              {reopenError && (
                <div style={{
                  background: '#450a0a', border: '1px solid #dc2626',
                  borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 13,
                }}>
                  ❌ {reopenError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowReopenModal(false)}>Отмена</button>
              <button
                onClick={handleReopen}
                disabled={reopening || reopenCode.length < 6}
                style={{
                  background: reopenCode.length >= 6 ? '#1e3a5f' : 'var(--bg3)',
                  border: `1px solid ${reopenCode.length >= 6 ? 'var(--accent)' : 'var(--border)'}`,
                  color: reopenCode.length >= 6 ? 'var(--accent)' : 'var(--text3)',
                  borderRadius: 10, padding: '10px 20px',
                  cursor: reopenCode.length >= 6 ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700, opacity: reopening ? 0.6 : 1,
                }}
              >
                {reopening ? '⏳ Открываю...' : '🔓 Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модал отмены скана ────────────────────────────────────── */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">↩️ Отменить сдачу</div>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                ОС будет возвращена в статус «Не сдал». Введите код подтверждения.
              </div>

              <div>
                <label className="label">Код подтверждения</label>
                <input
                  className="input"
                  placeholder="Введите 6-значный код..."
                  value={cancelCode}
                  onChange={e => { setCancelCode(e.target.value.toUpperCase()); setCancelError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleCancelItem()}
                  maxLength={6}
                  autoFocus
                  style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  Код отображается на странице бэкенда · Меняется каждые 8 часов
                </div>
              </div>

              {cancelError && (
                <div style={{
                  background: '#450a0a', border: '1px solid #dc2626',
                  borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 13,
                }}>
                  ❌ {cancelError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCancelModal(false)}>Отмена</button>
              <button
                onClick={handleCancelItem}
                disabled={cancelSubmitting || cancelCode.length < 6}
                style={{
                  background: cancelCode.length >= 6 ? '#1a3a2a' : 'var(--bg3)',
                  border: `1px solid ${cancelCode.length >= 6 ? '#2d6a45' : 'var(--border)'}`,
                  color: cancelCode.length >= 6 ? '#4ade80' : 'var(--text3)',
                  borderRadius: 10, padding: '10px 20px',
                  cursor: cancelCode.length >= 6 ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700, opacity: cancelSubmitting ? 0.6 : 1,
                }}
              >
                {cancelSubmitting ? '⏳ Отменяю...' : '↩️ Подтвердить отмену'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модал удаления ─────────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🗑️ Удалить сессию</div>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: '#450a0a', border: '1px solid #dc2626',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171',
              }}>
                ⚠️ Будут удалены сессия и все {session.stats.total} записей. Действие необратимо.
              </div>

              <div>
                <label className="label">Код подтверждения</label>
                <input
                  className="input"
                  placeholder="Введите 6-значный код..."
                  value={deleteCode}
                  onChange={e => { setDeleteCode(e.target.value.toUpperCase()); setDeleteError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleDelete()}
                  maxLength={6}
                  autoFocus
                  style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  Код находится по адресу:{' '}
                  <code style={{ color: 'var(--accent)', fontSize: 11 }}>
                    /api/collection/code
                  </code>
                  {' '}· Меняется каждые 8 часов
                </div>
              </div>

              {deleteError && (
                <div style={{
                  background: '#450a0a', border: '1px solid #dc2626',
                  borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 13,
                }}>
                  ❌ {deleteError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>Отмена</button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteCode.length < 6}
                style={{
                  background: deleteCode.length >= 6 ? '#7f1d1d' : 'var(--bg3)',
                  border: `1px solid ${deleteCode.length >= 6 ? '#dc2626' : 'var(--border)'}`,
                  color: deleteCode.length >= 6 ? '#f87171' : 'var(--text3)',
                  borderRadius: 10, padding: '10px 20px', cursor: deleteCode.length >= 6 ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700, opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? '⏳ Удаляю...' : '🗑️ Удалить навсегда'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модал массового принятия ──────────────────────────────── */}
      {bulkModal && (
        <div className="modal-overlay" onClick={() => setBulkModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">✅ Принять всех — {bulkModal}</div>
              <button className="modal-close" onClick={() => setBulkModal(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: '#1a3a2a', border: '1px solid #2d6a45',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#4ade80',
              }}>
                ℹ️ Все ОС в статусе «Не сдал» в кабинете <strong>«{bulkModal}»</strong> будут отмечены как «Принято».
                {returnedBy && <><br />Принимает: <strong>{returnedBy}</strong></>}
              </div>

              <div>
                <label className="label">Код подтверждения</label>
                <input
                  className="input"
                  placeholder="Введите 6-значный код..."
                  value={bulkCode}
                  onChange={e => { setBulkCode(e.target.value.toUpperCase()); setBulkError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleBulkAccept()}
                  maxLength={6}
                  autoFocus
                  style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  Код находится по адресу:{' '}
                  <code style={{ color: 'var(--accent)', fontSize: 11 }}>/api/collection/code</code>
                  {' '}· Меняется каждые 8 часов
                </div>
              </div>

              {bulkError && (
                <div style={{
                  background: '#450a0a', border: '1px solid #dc2626',
                  borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 13,
                }}>
                  ❌ {bulkError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setBulkModal(null)}>Отмена</button>
              <button
                onClick={handleBulkAccept}
                disabled={!!bulkAccepting || bulkCode.length < 6}
                style={{
                  background: bulkCode.length >= 6 ? '#1a3a2a' : 'var(--bg3)',
                  border: `1px solid ${bulkCode.length >= 6 ? '#2d6a45' : 'var(--border)'}`,
                  color: bulkCode.length >= 6 ? '#4ade80' : 'var(--text3)',
                  borderRadius: 10, padding: '10px 20px',
                  cursor: bulkCode.length >= 6 ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700, opacity: bulkAccepting ? 0.6 : 1,
                }}
              >
                {bulkAccepting ? '⏳ Принимаю...' : '✅ Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
