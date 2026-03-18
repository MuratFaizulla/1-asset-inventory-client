// pages/ImportPage.tsx

import { useRef, useState, useMemo } from 'react'
import api from '../api/client'

import type { Tab, ImportMode, PreviewResult, ApplyResult } from '../components/import/types'
import { toggleSet }        from '../components/import/utils'
import ImportUploadStep     from '../components/import/ImportUploadStep'
import ImportPreviewStep    from '../components/import/ImportPreviewStep'
import ImportDoneStep       from '../components/import/ImportDoneStep'

export default function ImportPage() {
  const [file,             setFile]             = useState<File | null>(null)
  const [step,             setStep]             = useState<'upload' | 'preview' | 'done'>('upload')
  const [loading,          setLoading]          = useState(false)
  const [elapsed,          setElapsed]          = useState(0)
  const [preview,          setPreview]          = useState<PreviewResult | null>(null)
  const [applyChanged,     setApplyChanged]     = useState(true)
  const [applying,         setApplying]         = useState(false)
  const [applyResult,      setApplyResult]      = useState<ApplyResult | null>(null)
  const [error,            setError]            = useState('')
  const [activeTab,        setActiveTab]        = useState<Tab>('new')
  const [orphanedSelected, setOrphanedSelected] = useState<Set<number>>(new Set())
  const [deleting,         setDeleting]         = useState(false)
  const [deletedCount,     setDeletedCount]     = useState<number | null>(null)
  const [searchChanged,    setSearchChanged]    = useState('')
  const [searchNew,        setSearchNew]        = useState('')
  const [searchOrphaned,   setSearchOrphaned]   = useState('')
  const [searchUnchanged,  setSearchUnchanged]  = useState('')
  const [expandedIds,      setExpandedIds]      = useState<Set<number>>(new Set())
  const [importMode,       setImportMode]       = useState<ImportMode>('partial')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Фильтрация ────────────────────────────────────────────────────────────────
  const filteredNew = useMemo(() => {
    if (!preview) return []
    const q = searchNew.toLowerCase()
    if (!q) return preview.newAssets
    return preview.newAssets.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.inventoryNumber.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      (a.employee || '').toLowerCase().includes(q)
    )
  }, [preview, searchNew])

  const filteredChanged = useMemo(() => {
    if (!preview) return []
    const q = searchChanged.toLowerCase()
    if (!q) return preview.changedAssets
    return preview.changedAssets.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.inventoryNumber.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      (a.employee || '').toLowerCase().includes(q) ||
      a.changes.some(c =>
        c.field.toLowerCase().includes(q) ||
        String(c.oldVal).toLowerCase().includes(q) ||
        String(c.newVal).toLowerCase().includes(q)
      )
    )
  }, [preview, searchChanged])

  const filteredUnchanged = useMemo(() => {
    if (!preview) return []
    const q = searchUnchanged.toLowerCase()
    if (!q) return preview.unchangedAssets || []
    return (preview.unchangedAssets || []).filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.inventoryNumber.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      (a.employee || '').toLowerCase().includes(q)
    )
  }, [preview, searchUnchanged])

  const filteredOrphaned = useMemo(() => {
    if (!preview) return []
    const q = searchOrphaned.toLowerCase()
    if (!q) return preview.orphaned
    return preview.orphaned.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.inventoryNumber.toLowerCase().includes(q) ||
      o.location.toLowerCase().includes(q) ||
      o.mol.toLowerCase().includes(q)
    )
  }, [preview, searchOrphaned])

  // ── Хендлеры ─────────────────────────────────────────────────────────────────
  const resetState = () => {
    setStep('upload'); setFile(null); setPreview(null)
    setApplyResult(null); setError(''); setDeletedCount(null)
    setSearchChanged(''); setSearchNew('')
    setSearchOrphaned(''); setSearchUnchanged('')
    setExpandedIds(new Set())
  }

  const handleFile = (f: File) => {
    setFile(f)
    setStep('upload'); setPreview(null); setError('')
    setApplyResult(null); setDeletedCount(null)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true); setError(''); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('mode', importMode)
      const res = await api.post<PreviewResult>('/import/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(res.data)
      setOrphanedSelected(new Set(res.data.orphaned.map(o => o.id)))
      if      (res.data.newAssets.length)           setActiveTab('new')
      else if (res.data.changedAssets.length)        setActiveTab('changed')
      else if (res.data.unchangedAssets?.length)     setActiveTab('unchanged')
      else if (res.data.orphaned.length)             setActiveTab('orphaned')
      setStep('preview')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Ошибка анализа файла')
    } finally {
      setLoading(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const handleApply = async () => {
    if (!file) return
    setApplying(true); setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('applyChanged', String(applyChanged))
      const res = await api.post<ApplyResult>('/import/apply', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setApplyResult(res.data)
      setStep('done')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Ошибка применения')
    } finally {
      setApplying(false)
    }
  }

  const handleDeleteOrphaned = async () => {
    if (!orphanedSelected.size) return
    if (!confirm(`Удалить ${orphanedSelected.size} ОС из базы? Это действие необратимо.`)) return
    setDeleting(true)
    try {
      const res = await api.delete<{ deleted: number }>('/import/orphaned', {
        data: { ids: Array.from(orphanedSelected) },
      })
      setDeletedCount(res.data.deleted)
      setPreview(prev => prev
        ? { ...prev, orphaned: prev.orphaned.filter(o => !orphanedSelected.has(o.id)) }
        : prev
      )
      setOrphanedSelected(new Set())
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Ошибка удаления')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleExpand   = (id: number) => setExpandedIds(prev => toggleSet(prev, id))
  const handleOrphanToggle   = (id: number) => setOrphanedSelected(prev => toggleSet(prev, id))

  const handleToggleAll = () =>
    setExpandedIds(prev =>
      prev.size === filteredChanged.length
        ? new Set()
        : new Set(filteredChanged.map(a => a.id))
    )

  const handleOrphanSelectAll = () =>
    setOrphanedSelected(prev =>
      prev.size === filteredOrphaned.length
        ? new Set()
        : new Set(filteredOrphaned.map(o => o.id))
    )

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Импорт из 1С</div>
          <div className="page-subtitle">
            {step === 'upload'  && 'Загрузите Excel файл выгрузки ОС'}
            {step === 'preview' && 'Проверьте изменения перед применением'}
            {step === 'done'    && 'Импорт завершён успешно'}
          </div>
        </div>
        {step !== 'upload' && (
          <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={resetState}>
            ← Загрузить другой файл
          </button>
        )}
      </div>

      {step === 'upload' && (
        <ImportUploadStep
          file={file}
          loading={loading}
          elapsed={elapsed}
          error={error}
          importMode={importMode}
          onFile={handleFile}
          onClearFile={() => setFile(null)}
          onModeChange={setImportMode}
          onAnalyze={handleAnalyze}
        />
      )}

      {step === 'preview' && preview && (
        <ImportPreviewStep
          preview={preview}
          activeTab={activeTab}
          applyChanged={applyChanged}
          applying={applying}
          error={error}
          expandedIds={expandedIds}
          searchNew={searchNew}
          searchChanged={searchChanged}
          searchUnchanged={searchUnchanged}
          searchOrphaned={searchOrphaned}
          orphanedSelected={orphanedSelected}
          deleting={deleting}
          deletedCount={deletedCount}
          filteredNew={filteredNew}
          filteredChanged={filteredChanged}
          filteredUnchanged={filteredUnchanged}
          filteredOrphaned={filteredOrphaned}
          onTabChange={setActiveTab}
          onApplyChanged={setApplyChanged}
          onApply={handleApply}
          onToggleExpand={handleToggleExpand}
          onToggleAll={handleToggleAll}
          onSearchNew={setSearchNew}
          onSearchChanged={setSearchChanged}
          onSearchUnchanged={setSearchUnchanged}
          onSearchOrphaned={setSearchOrphaned}
          onOrphanToggle={handleOrphanToggle}
          onOrphanSelectAll={handleOrphanSelectAll}
          onDeleteOrphaned={handleDeleteOrphaned}
        />
      )}

      {step === 'done' && applyResult && (
        <ImportDoneStep
          result={applyResult}
          onReset={resetState}
        />
      )}
    </div>
  )
}







// import { useRef, useState, useMemo } from 'react'
// import api from '../api/client'

// interface OrphanedAsset {
//   id: number
//   inventoryNumber: string
//   name: string
//   location: string
//   mol: string
// }

// interface NewAsset {
//   inventoryNumber: string
//   name: string
//   location: string
//   mol: string
//   employee: string | null
// }

// interface ChangedAsset {
//   id: number
//   inventoryNumber: string
//   name: string
//   location: string
//   mol: string
//   employee: string | null
//   changes: { field: string; oldVal: string; newVal: string }[]
// }

// interface UnchangedAsset {
//   inventoryNumber: string
//   name: string
//   location: string
//   mol: string
//   employee: string | null
// }

// interface PreviewResult {
//   total: number
//   skipped: number
//   unchanged: number
//   mode: string
//   newAssets: NewAsset[]
//   changedAssets: ChangedAsset[]
//   unchangedAssets: UnchangedAsset[]
//   orphaned: OrphanedAsset[]
// }

// interface ApplyResult {
//   created: number
//   updated: number
//   unchanged: number
//   errors: { inv: string; error: string }[]
// }

// type Tab = 'new' | 'changed' | 'unchanged' | 'orphaned'
// type ImportMode = 'partial' | 'full'

// const toggleOrphaned = (prev: Set<number>, id: number): Set<number> => {
//   const n = new Set(prev)
//   if (n.has(id)) { n.delete(id) } else { n.add(id) }
//   return n
// }

// const Spinner = ({ size = 16 }: { size?: number }) => (
//   <span style={{
//     width: size, height: size,
//     border: '2px solid #ffffff44', borderTop: '2px solid #fff',
//     borderRadius: '50%', display: 'inline-block',
//     animation: 'spin 0.8s linear infinite'
//   }} />
// )

// export default function ImportPage() {
//   const [file, setFile]                         = useState<File | null>(null)
//   const [step, setStep]                         = useState<'upload' | 'preview' | 'done'>('upload')
//   const [loading, setLoading]                   = useState(false)
//   const [elapsed, setElapsed]                   = useState(0)
//   const [preview, setPreview]                   = useState<PreviewResult | null>(null)
//   const [applyChanged, setApplyChanged]         = useState(true)
//   const [applying, setApplying]                 = useState(false)
//   const [applyResult, setApplyResult]           = useState<ApplyResult | null>(null)
//   const [error, setError]                       = useState('')
//   const [activeTab, setActiveTab]               = useState<Tab>('new')
//   const [orphanedSelected, setOrphanedSelected] = useState<Set<number>>(new Set())
//   const [deleting, setDeleting]                 = useState(false)
//   const [deletedCount, setDeletedCount]         = useState<number | null>(null)
//   const [searchChanged, setSearchChanged]       = useState('')
//   const [searchNew, setSearchNew]               = useState('')
//   const [searchOrphaned, setSearchOrphaned]     = useState('')
//   const [searchUnchanged, setSearchUnchanged]   = useState('')
//   const [expandedIds, setExpandedIds]           = useState<Set<number>>(new Set())
//   const [importMode, setImportMode]             = useState<ImportMode>('partial')

//   const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
//   const inputRef = useRef<HTMLInputElement>(null)

//   // ─── Фильтрация ──────────────────────────────────────
//   const filteredNew = useMemo(() => {
//     if (!preview) return []
//     const q = searchNew.toLowerCase()
//     if (!q) return preview.newAssets
//     return preview.newAssets.filter(a =>
//       a.name.toLowerCase().includes(q) ||
//       a.inventoryNumber.toLowerCase().includes(q) ||
//       a.location.toLowerCase().includes(q) ||
//       (a.employee || '').toLowerCase().includes(q)
//     )
//   }, [preview, searchNew])

//   const filteredChanged = useMemo(() => {
//     if (!preview) return []
//     const q = searchChanged.toLowerCase()
//     if (!q) return preview.changedAssets
//     return preview.changedAssets.filter(a =>
//       a.name.toLowerCase().includes(q) ||
//       a.inventoryNumber.toLowerCase().includes(q) ||
//       a.location.toLowerCase().includes(q) ||
//       (a.employee || '').toLowerCase().includes(q) ||
//       a.changes.some(c =>
//         c.field.toLowerCase().includes(q) ||
//         String(c.oldVal).toLowerCase().includes(q) ||
//         String(c.newVal).toLowerCase().includes(q)
//       )
//     )
//   }, [preview, searchChanged])

//   const filteredUnchanged = useMemo(() => {
//     if (!preview) return []
//     const q = searchUnchanged.toLowerCase()
//     if (!q) return preview.unchangedAssets || []
//     return (preview.unchangedAssets || []).filter(a =>
//       a.name.toLowerCase().includes(q) ||
//       a.inventoryNumber.toLowerCase().includes(q) ||
//       a.location.toLowerCase().includes(q) ||
//       (a.employee || '').toLowerCase().includes(q)
//     )
//   }, [preview, searchUnchanged])

//   const filteredOrphaned = useMemo(() => {
//     if (!preview) return []
//     const q = searchOrphaned.toLowerCase()
//     if (!q) return preview.orphaned
//     return preview.orphaned.filter(o =>
//       o.name.toLowerCase().includes(q) ||
//       o.inventoryNumber.toLowerCase().includes(q) ||
//       o.location.toLowerCase().includes(q) ||
//       o.mol.toLowerCase().includes(q)
//     )
//   }, [preview, searchOrphaned])

//   // ─── Handlers ────────────────────────────────────────
//   const resetState = () => {
//     setStep('upload'); setFile(null); setPreview(null)
//     setApplyResult(null); setError(''); setDeletedCount(null)
//     setSearchChanged(''); setSearchNew('')
//     setSearchOrphaned(''); setSearchUnchanged('')
//     setExpandedIds(new Set())
//   }

//   const handleFile = (f: File) => {
//     setFile(f)
//     setStep('upload'); setPreview(null); setError('')
//     setApplyResult(null); setDeletedCount(null)
//   }

//   const handleAnalyze = async () => {
//     if (!file) return
//     setLoading(true); setError(''); setElapsed(0)
//     timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
//     try {
//       const form = new FormData()
//       form.append('file', file)
//       form.append('mode', importMode)
//       const res = await api.post<PreviewResult>('/import/preview', form, {
//         headers: { 'Content-Type': 'multipart/form-data' }
//       })
//       setPreview(res.data)
//       setOrphanedSelected(new Set(res.data.orphaned.map(o => o.id)))
//       if (res.data.newAssets.length)          setActiveTab('new')
//       else if (res.data.changedAssets.length) setActiveTab('changed')
//       else if (res.data.unchangedAssets?.length) setActiveTab('unchanged')
//       else if (res.data.orphaned.length)      setActiveTab('orphaned')
//       setStep('preview')
//     } catch (e: unknown) {
//       const err = e as { response?: { data?: { error?: string } } }
//       setError(err.response?.data?.error || 'Ошибка анализа файла')
//     } finally {
//       setLoading(false)
//       if (timerRef.current) clearInterval(timerRef.current)
//     }
//   }

//   const handleApply = async () => {
//     if (!file) return
//     setApplying(true); setError('')
//     try {
//       const form = new FormData()
//       form.append('file', file)
//       form.append('applyChanged', String(applyChanged))
//       const res = await api.post<ApplyResult>('/import/apply', form, {
//         headers: { 'Content-Type': 'multipart/form-data' }
//       })
//       setApplyResult(res.data)
//       setStep('done')
//     } catch (e: unknown) {
//       const err = e as { response?: { data?: { error?: string } } }
//       setError(err.response?.data?.error || 'Ошибка применения')
//     } finally {
//       setApplying(false)
//     }
//   }

//   const handleDeleteOrphaned = async () => {
//     if (!orphanedSelected.size) return
//     if (!confirm(`Удалить ${orphanedSelected.size} ОС из базы? Это действие необратимо.`)) return
//     setDeleting(true)
//     try {
//       const res = await api.delete<{ deleted: number }>('/import/orphaned', {
//         data: { ids: Array.from(orphanedSelected) }
//       })
//       setDeletedCount(res.data.deleted)
//       setPreview(prev => prev
//         ? { ...prev, orphaned: prev.orphaned.filter(o => !orphanedSelected.has(o.id)) }
//         : prev
//       )
//       setOrphanedSelected(new Set())
//     } catch (e: unknown) {
//       const err = e as { response?: { data?: { error?: string } } }
//       setError(err.response?.data?.error || 'Ошибка удаления')
//     } finally {
//       setDeleting(false)
//     }
//   }

//   const toggleExpand = (id: number) => {
//     setExpandedIds(prev => {
//       const n = new Set(prev)
//       if (n.has(id)) n.delete(id); else n.add(id)
//       return n
//     })
//   }

//   const tabCount = (t: Tab) => {
//     if (!preview) return 0
//     if (t === 'new')       return preview.newAssets.length
//     if (t === 'changed')   return preview.changedAssets.length
//     if (t === 'unchanged') return preview.unchangedAssets?.length ?? 0
//     return preview.orphaned.length
//   }

//   // ─── Компоненты ──────────────────────────────────────
//   const TabBtn = ({ t, label, color }: { t: Tab; label: string; color: string }) => (
//     <button onClick={() => setActiveTab(t)} style={{
//       padding: '8px 14px', borderRadius: 8, border: 'none',
//       cursor: 'pointer', fontSize: 13, fontWeight: 600,
//       background: activeTab === t ? color + '22' : 'var(--bg3)',
//       color: activeTab === t ? color : 'var(--text2)',
//       outline: activeTab === t ? `1.5px solid ${color}` : 'none',
//       transition: 'all .15s',
//     }}>
//       {label} <span style={{ opacity: 0.7, fontWeight: 400 }}>({tabCount(t)})</span>
//     </button>
//   )

//   const SearchInput = ({
//     value, onChange, placeholder
//   }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
//     <div style={{ position: 'relative', marginBottom: 12 }}>
//       <span style={{
//         position: 'absolute', left: 10, top: '50%',
//         transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 14
//       }}>🔍</span>
//       <input
//         value={value}
//         onChange={e => onChange(e.target.value)}
//         placeholder={placeholder}
//         style={{
//           width: '100%', padding: '8px 10px 8px 32px',
//           background: 'var(--bg3)', border: '1px solid var(--border)',
//           borderRadius: 8, color: 'var(--text1)', fontSize: 13,
//           boxSizing: 'border-box', outline: 'none',
//         }}
//       />
//       {value && (
//         <button onClick={() => onChange('')} style={{
//           position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
//           background: 'none', border: 'none', cursor: 'pointer',
//           color: 'var(--text3)', fontSize: 16, lineHeight: 1, padding: 0,
//         }}>×</button>
//       )}
//     </div>
//   )

//   const ErrorBox = ({ msg }: { msg: string }) => (
//     <div style={{
//       marginBottom: 12, padding: '10px 14px',
//       background: '#450a0a22', border: '1px solid var(--danger)',
//       borderRadius: 8, color: '#fca5a5', fontSize: 13,
//       display: 'flex', alignItems: 'center', gap: 8
//     }}>
//       ❌ {msg}
//     </div>
//   )

//   // Общая таблица для новых и актуальных ОС
//   const AssetTable = ({ items, emptyText }: {
//     items: (NewAsset | UnchangedAsset)[]
//     emptyText: string
//   }) => (
//     items.length === 0
//       ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>{emptyText}</div>
//       : <>
//           {/* Mobile */}
//           <div className="mobile-only" style={{ flexDirection: 'column', maxHeight: 460, overflowY: 'auto' }}>
//             {items.map((a, i) => (
//               <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
//                 <div style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</div>
//                 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
//                   <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{a.inventoryNumber}</span>
//                   <span style={{ fontSize: 11, color: 'var(--text3)' }}>📍 {a.location}</span>
//                   {a.employee && <span style={{ fontSize: 11, color: 'var(--text3)' }}>👤 {a.employee}</span>}
//                 </div>
//               </div>
//             ))}
//           </div>
//           {/* Desktop */}
//           <div className="desktop-only" style={{ maxHeight: 400, overflowY: 'auto' }}>
//             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
//               <thead style={{ background: 'var(--bg3)', position: 'sticky', top: 0 }}>
//                 <tr>
//                   <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>ИНВ. НОМЕР</th>
//                   <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>НАИМЕНОВАНИЕ</th>
//                   <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>КАБИНЕТ</th>
//                   <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>МОЛ</th>
//                   <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>СОТРУДНИК</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {items.map((a, i) => (
//                   <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
//                     <td style={{ padding: '8px 12px' }}><span className="mono" style={{ fontSize: 12 }}>{a.inventoryNumber}</span></td>
//                     <td style={{ padding: '8px 12px', fontWeight: 500 }}>{a.name}</td>
//                     <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>{a.location}</td>
//                     <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>{a.mol.split(' ').slice(0, 2).join(' ')}</td>
//                     <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>{a.employee || '—'}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </>
//   )

//   // ─── Render ──────────────────────────────────────────
//   return (
//     <div>
//       <style>{`
//         @keyframes spin { to { transform: rotate(360deg); } }
//         .changed-row:hover { background: var(--bg3) !important; }
//       `}</style>

//       <div className="page-header">
//         <div>
//           <div className="page-title">Импорт из 1С</div>
//           <div className="page-subtitle">
//             {step === 'upload'  && 'Загрузите Excel файл выгрузки ОС'}
//             {step === 'preview' && 'Проверьте изменения перед применением'}
//             {step === 'done'    && 'Импорт завершён успешно'}
//           </div>
//         </div>
//         {step !== 'upload' && (
//           <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={resetState}>
//             ← Загрузить другой файл
//           </button>
//         )}
//       </div>

//       {/* ══════════ UPLOAD ══════════ */}
//       {step === 'upload' && (
//         <div style={{ maxWidth: 560 }}>
//           {/* Зона загрузки */}
//           <div
//             className="card"
//             style={{
//               borderStyle: 'dashed',
//               borderColor: file ? 'var(--accent2)' : 'var(--border)',
//               textAlign: 'center', padding: '44px 24px',
//               cursor: 'pointer', marginBottom: 14,
//               transition: 'border-color .2s',
//             }}
//             onClick={() => inputRef.current?.click()}
//             onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
//             onDragOver={e => e.preventDefault()}
//           >
//             <div style={{ fontSize: 40, marginBottom: 14 }}>{file ? '✅' : '📄'}</div>
//             {file ? (
//               <>
//                 <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{file.name}</div>
//                 <div style={{ fontSize: 12, color: 'var(--text3)' }}>
//                   {(file.size / 1024).toFixed(1)} KB
//                   <button
//                     onClick={e => { e.stopPropagation(); setFile(null) }}
//                     style={{ marginLeft: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12 }}>
//                     ✕ убрать
//                   </button>
//                 </div>
//               </>
//             ) : (
//               <>
//                 <div style={{ fontWeight: 500, marginBottom: 6 }}>Перетащите файл или нажмите для выбора</div>
//                 <div style={{ fontSize: 12, color: 'var(--text3)' }}>.xlsx, .xls — выгрузка ОС из 1С</div>
//               </>
//             )}
//             <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
//               onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
//           </div>

//           {/* Режим импорта */}
//           <div style={{
//             background: 'var(--bg2)', border: '1px solid var(--border)',
//             borderRadius: 10, padding: '14px 18px', marginBottom: 14
//           }}>
//             <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Режим импорта</div>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//               <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
//                 <input type="radio" name="importMode" value="partial"
//                   checked={importMode === 'partial'}
//                   onChange={() => setImportMode('partial')}
//                   style={{ marginTop: 3, accentColor: 'var(--accent2)', flexShrink: 0 }} />
//                 <div>
//                   <div style={{ fontSize: 13, fontWeight: 500 }}>Частичный импорт</div>
//                   <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
//                     Файл содержит часть ОС. Добавить/обновить только их. Остальные не трогать.
//                   </div>
//                 </div>
//               </label>
//               <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
//                 <input type="radio" name="importMode" value="full"
//                   checked={importMode === 'full'}
//                   onChange={() => setImportMode('full')}
//                   style={{ marginTop: 3, accentColor: 'var(--accent2)', flexShrink: 0 }} />
//                 <div>
//                   <div style={{ fontSize: 13, fontWeight: 500 }}>Полный импорт</div>
//                   <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
//                     Файл содержит ВСЕ ОС организации. Показать ОС которых нет в файле как "лишние".
//                   </div>
//                 </div>
//               </label>
//             </div>
//           </div>

//           {error && <ErrorBox msg={error} />}

//           <button className="btn btn-primary" onClick={handleAnalyze} disabled={!file || loading}
//             style={{ width: '100%', justifyContent: 'center', padding: '13px 0', fontSize: 14 }}>
//             {loading ? (
//               <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
//                 <Spinner />
//                 Анализируем файл... {elapsed > 0 && `(${elapsed}с)`}
//               </span>
//             ) : '🔍 Анализировать файл'}
//           </button>
//         </div>
//       )}

//       {/* ══════════ PREVIEW ══════════ */}
//       {step === 'preview' && preview && (
//         <div>
//           {/* Статистика */}
//           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
//             {[
//               { label: 'Всего в файле',  value: preview.total,                        color: 'var(--text1)' },
//               { label: '🆕 Новых',       value: preview.newAssets.length,             color: '#4ade80' },
//               { label: '✏️ Изменённых',  value: preview.changedAssets.length,         color: '#facc15' },
//               { label: '➖ Уже в базе',  value: preview.unchangedAssets?.length ?? 0, color: 'var(--text3)' },
//               ...(preview.orphaned.length > 0
//                 ? [{ label: '⚠️ Лишних', value: preview.orphaned.length, color: '#f87171' }]
//                 : []
//               ),
//               ...(preview.skipped > 0
//                 ? [{ label: '⏭️ Пропущено', value: preview.skipped, color: 'var(--text3)' }]
//                 : []
//               ),
//             ].map(s => (
//               <div key={s.label} style={{
//                 background: 'var(--bg2)', border: '1px solid var(--border)',
//                 borderRadius: 10, padding: '12px 16px'
//               }}>
//                 <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'IBM Plex Mono' }}>{s.value}</div>
//                 <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{s.label}</div>
//               </div>
//             ))}
//           </div>

//           {/* Режим — информация */}
//           <div style={{
//             display: 'flex', alignItems: 'center', gap: 8,
//             fontSize: 12, color: 'var(--text3)',
//             background: 'var(--bg3)', borderRadius: 8,
//             padding: '8px 12px', marginBottom: 14
//           }}>
//             <span>{preview.mode === 'partial' ? '🔀' : '📋'}</span>
//             <span>
//               {preview.mode === 'partial'
//                 ? 'Частичный импорт — лишние ОС не анализируются'
//                 : 'Полный импорт — показаны все ОС которых нет в файле'
//               }
//             </span>
//           </div>

//           {/* Настройки применения */}
//           <div style={{
//             background: 'var(--bg2)', border: '1px solid var(--border)',
//             borderRadius: 12, padding: '14px 18px', marginBottom: 14
//           }}>
//             <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>⚙️ Настройки применения</div>
//             <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
//               <input type="checkbox" checked={applyChanged} onChange={e => setApplyChanged(e.target.checked)}
//                 style={{ accentColor: 'var(--accent2)', width: 16, height: 16 }} />
//               <span>Применить изменения для <strong>{preview.changedAssets.length}</strong> ОС</span>
//               {!applyChanged && (
//                 <span style={{ fontSize: 11, color: 'var(--text3)' }}>(только новые будут добавлены)</span>
//               )}
//             </label>
//           </div>

//           {error && <ErrorBox msg={error} />}

//           {/* Кнопка применить */}
//           <div style={{ marginBottom: 18 }}>
//             <button className="btn btn-primary" onClick={handleApply} disabled={applying}
//               style={{ padding: '12px 28px', minWidth: 220, justifyContent: 'center', fontSize: 14 }}>
//               {applying ? (
//                 <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//                   <Spinner size={14} /> Применяем...
//                 </span>
//               ) : `✅ Применить (${preview.newAssets.length + (applyChanged ? preview.changedAssets.length : 0)} ОС)`}
//             </button>
//           </div>

//           {/* Табы */}
//           <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
//             <TabBtn t="new"       label="🆕 Новые"       color="#4ade80" />
//             <TabBtn t="changed"   label="✏️ Изменённые"  color="#facc15" />
//             <TabBtn t="unchanged" label="➖ Уже в базе"  color="var(--text2)" />
//             {preview.orphaned.length > 0 && (
//               <TabBtn t="orphaned" label="⚠️ Лишние" color="#f87171" />
//             )}
//           </div>

//           {/* ── Новые ── */}
//           {activeTab === 'new' && (
//             <>
//               <SearchInput value={searchNew} onChange={setSearchNew}
//                 placeholder="Поиск по названию, номеру, кабинету, сотруднику..." />
//               <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
//                 <div style={{ padding: '8px 12px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>
//                   Показано: {filteredNew.length} из {preview.newAssets.length}
//                 </div>
//                 <AssetTable items={filteredNew} emptyText={searchNew ? 'Ничего не найдено' : 'Нет новых ОС'} />
//               </div>
//             </>
//           )}

//           {/* ── Изменённые ── */}
//           {activeTab === 'changed' && (
//             <>
//               <SearchInput value={searchChanged} onChange={setSearchChanged}
//                 placeholder="Поиск по названию, номеру, кабинету, полю изменения..." />
//               {filteredChanged.length === 0
//                 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
//                     {searchChanged ? 'Ничего не найдено' : 'Нет изменённых ОС'}
//                   </div>
//                 : <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
//                     <div style={{
//                       padding: '8px 12px', background: 'var(--bg3)',
//                       fontSize: 11, color: 'var(--text3)',
//                       borderBottom: '1px solid var(--border)',
//                       display: 'flex', justifyContent: 'space-between', alignItems: 'center'
//                     }}>
//                       <span>Показано: {filteredChanged.length} из {preview.changedAssets.length}</span>
//                       <button
//                         onClick={() => setExpandedIds(
//                           expandedIds.size === filteredChanged.length
//                             ? new Set()
//                             : new Set(filteredChanged.map(a => a.id))
//                         )}
//                         style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11 }}>
//                         {expandedIds.size === filteredChanged.length ? 'Свернуть все' : 'Развернуть все'}
//                       </button>
//                     </div>
//                     <div style={{ maxHeight: 520, overflowY: 'auto' }}>
//                       {filteredChanged.map(a => {
//                         const isExpanded = expandedIds.has(a.id)
//                         return (
//                           <div key={a.id} className="changed-row"
//                             style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}>
//                             <div onClick={() => toggleExpand(a.id)} style={{
//                               padding: '10px 16px', cursor: 'pointer',
//                               display: 'flex', justifyContent: 'space-between',
//                               alignItems: 'center', gap: 8
//                             }}>
//                               <div style={{ minWidth: 0 }}>
//                                 <span style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</span>
//                                 <span className="mono" style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
//                                   {a.inventoryNumber}
//                                 </span>
//                                 {a.employee && (
//                                   <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
//                                     👤 {a.employee}
//                                   </span>
//                                 )}
//                                 {!isExpanded && (
//                                   <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
//                                     📍 {a.location}
//                                   </span>
//                                 )}
//                               </div>
//                               <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
//                                 <span style={{
//                                   fontSize: 11, color: '#facc15',
//                                   background: '#facc1522', borderRadius: 4,
//                                   padding: '2px 6px', fontWeight: 600
//                                 }}>
//                                   {a.changes.length} изм.
//                                 </span>
//                                 <span style={{ color: 'var(--text3)', fontSize: 12 }}>
//                                   {isExpanded ? '▲' : '▼'}
//                                 </span>
//                               </div>
//                             </div>
//                             {isExpanded && (
//                               <div style={{
//                                 padding: '0 16px 12px 16px',
//                                 background: 'var(--bg3)',
//                                 borderTop: '1px solid var(--border)'
//                               }}>
//                                 <div style={{ fontSize: 11, color: 'var(--text3)', padding: '8px 0 6px' }}>
//                                   📍 {a.location} · МОЛ: {a.mol}
//                                 </div>
//                                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
//                                   {a.changes.map((c, j) => (
//                                     <div key={j} style={{
//                                       display: 'grid',
//                                       gridTemplateColumns: '130px 1fr auto 1fr',
//                                       gap: 8, alignItems: 'center', fontSize: 12
//                                     }}>
//                                       <span style={{
//                                         color: 'var(--text3)', fontSize: 11,
//                                         background: 'var(--bg2)', borderRadius: 4,
//                                         padding: '2px 6px', textAlign: 'center'
//                                       }}>
//                                         {c.field}
//                                       </span>
//                                       <span style={{
//                                         color: '#f87171', textDecoration: 'line-through',
//                                         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
//                                       }}>
//                                         {String(c.oldVal) || '—'}
//                                       </span>
//                                       <span style={{ color: 'var(--text3)' }}>→</span>
//                                       <span style={{
//                                         color: '#4ade80',
//                                         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
//                                       }}>
//                                         {String(c.newVal) || '—'}
//                                       </span>
//                                     </div>
//                                   ))}
//                                 </div>
//                               </div>
//                             )}
//                           </div>
//                         )
//                       })}
//                     </div>
//                   </div>
//               }
//             </>
//           )}

//           {/* ── Уже в базе ── */}
//           {activeTab === 'unchanged' && (
//             <>
//               <SearchInput value={searchUnchanged} onChange={setSearchUnchanged}
//                 placeholder="Поиск по названию, номеру, кабинету, сотруднику..." />
//               <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
//                 <div style={{
//                   padding: '8px 12px', background: 'var(--bg3)',
//                   fontSize: 11, color: 'var(--text3)',
//                   borderBottom: '1px solid var(--border)'
//                 }}>
//                   Показано: {filteredUnchanged.length} из {preview.unchangedAssets?.length ?? 0} — эти ОС уже актуальны, изменений нет
//                 </div>
//                 <AssetTable
//                   items={filteredUnchanged}
//                   emptyText={searchUnchanged ? 'Ничего не найдено' : 'Нет актуальных ОС'}
//                 />
//               </div>
//             </>
//           )}

//           {/* ── Лишние ── */}
//           {activeTab === 'orphaned' && (
//             <>
//               <SearchInput value={searchOrphaned} onChange={setSearchOrphaned}
//                 placeholder="Поиск по названию, номеру, кабинету, МОЛ..." />
//               {preview.orphaned.length === 0
//                 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
//                     {deletedCount !== null ? `✅ Удалено ${deletedCount} ОС` : 'Лишних ОС нет'}
//                   </div>
//                 : <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
//                     <div style={{
//                       padding: '10px 16px', borderBottom: '1px solid var(--border)',
//                       display: 'flex', gap: 8, flexWrap: 'wrap',
//                       alignItems: 'center', justifyContent: 'space-between'
//                     }}>
//                       <span style={{ fontSize: 13, color: 'var(--text2)' }}>
//                         Выбрано: <strong>{orphanedSelected.size}</strong> из {preview.orphaned.length}
//                       </span>
//                       <div style={{ display: 'flex', gap: 8 }}>
//                         <button className="btn btn-outline" style={{ fontSize: 12 }}
//                           onClick={() => orphanedSelected.size === filteredOrphaned.length
//                             ? setOrphanedSelected(new Set())
//                             : setOrphanedSelected(new Set(filteredOrphaned.map(o => o.id)))
//                           }>
//                           {orphanedSelected.size === filteredOrphaned.length ? 'Снять всё' : 'Выбрать всё'}
//                         </button>
//                         <button className="btn btn-danger" style={{ fontSize: 12 }}
//                           onClick={handleDeleteOrphaned}
//                           disabled={orphanedSelected.size === 0 || deleting}>
//                           {deleting
//                             ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Spinner size={12} /> Удаляем...</span>
//                             : `🗑️ Удалить (${orphanedSelected.size})`}
//                         </button>
//                       </div>
//                     </div>
//                     {/* Mobile */}
//                     <div className="mobile-only" style={{ flexDirection: 'column', maxHeight: 400, overflowY: 'auto' }}>
//                       {filteredOrphaned.map(o => (
//                         <div key={o.id}
//                           onClick={() => setOrphanedSelected(prev => toggleOrphaned(prev, o.id))}
//                           style={{
//                             padding: '10px 14px', borderBottom: '1px solid var(--border)',
//                             background: orphanedSelected.has(o.id) ? '#450a0a20' : undefined,
//                             cursor: 'pointer', display: 'flex', gap: 10
//                           }}>
//                           <input type="checkbox" checked={orphanedSelected.has(o.id)} onChange={() => {}}
//                             onClick={e => e.stopPropagation()}
//                             style={{ marginTop: 3, accentColor: 'var(--danger)', flexShrink: 0 }} />
//                           <div>
//                             <div style={{ fontSize: 13, fontWeight: 500 }}>{o.name}</div>
//                             <div style={{ fontSize: 11, color: 'var(--text3)' }}>{o.inventoryNumber} · {o.location}</div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                     {/* Desktop */}
//                     <div className="desktop-only" style={{ maxHeight: 380, overflowY: 'auto' }}>
//                       <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
//                         <thead style={{ background: 'var(--bg3)', position: 'sticky', top: 0 }}>
//                           <tr>
//                             <th style={{ padding: '8px 12px', width: 40 }}></th>
//                             <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>ИНВ. НОМЕР</th>
//                             <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>НАИМЕНОВАНИЕ</th>
//                             <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>КАБИНЕТ</th>
//                             <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>МОЛ</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {filteredOrphaned.map(o => (
//                             <tr key={o.id}
//                               onClick={() => setOrphanedSelected(prev => toggleOrphaned(prev, o.id))}
//                               style={{
//                                 borderBottom: '1px solid var(--border)', cursor: 'pointer',
//                                 background: orphanedSelected.has(o.id) ? '#450a0a15' : undefined,
//                               }}>
//                               <td style={{ padding: '8px 12px' }}>
//                                 <input type="checkbox" checked={orphanedSelected.has(o.id)} onChange={() => {}}
//                                   onClick={e => e.stopPropagation()}
//                                   style={{ accentColor: 'var(--danger)' }} />
//                               </td>
//                               <td style={{ padding: '8px 12px' }}><span className="mono" style={{ fontSize: 12 }}>{o.inventoryNumber}</span></td>
//                               <td style={{ padding: '8px 12px', fontWeight: 500 }}>{o.name}</td>
//                               <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>{o.location}</td>
//                               <td style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 12 }}>{o.mol.split(' ').slice(0, 2).join(' ')}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   </div>
//               }
//             </>
//           )}
//         </div>
//       )}

//       {/* ══════════ DONE ══════════ */}
//       {step === 'done' && applyResult && (
//         <div style={{ maxWidth: 500 }}>
//           <div style={{
//             padding: 20, background: '#064e3b22',
//             border: '1px solid var(--accent2)',
//             borderRadius: 12, marginBottom: 16
//           }}>
//             <div style={{ fontWeight: 600, marginBottom: 16, color: 'var(--accent2)', fontSize: 15 }}>
//               ✅ Импорт завершён
//             </div>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
//               {[
//                 { label: '🆕 Добавлено',     value: applyResult.created,             color: '#4ade80' },
//                 { label: '✏️ Обновлено',      value: applyResult.updated,             color: '#facc15' },
//                 { label: '➖ Без изменений',  value: applyResult.unchanged,           color: 'var(--text3)' },
//                 { label: '⚠️ Ошибок',         value: applyResult.errors?.length || 0, color: '#f87171' },
//               ].map(s => (
//                 <div key={s.label} style={{ background: 'var(--bg3)', padding: '12px 16px', borderRadius: 8 }}>
//                   <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'IBM Plex Mono' }}>
//                     {s.value}
//                   </div>
//                   <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
//                 </div>
//               ))}
//             </div>
//             {applyResult.errors?.length > 0 && (
//               <div style={{ marginTop: 14 }}>
//                 <div style={{ fontSize: 12, color: '#f87171', marginBottom: 6, fontWeight: 500 }}>
//                   Ошибки при импорте:
//                 </div>
//                 <div style={{
//                   maxHeight: 140, overflowY: 'auto', fontSize: 11,
//                   color: 'var(--text3)', background: 'var(--bg3)',
//                   borderRadius: 6, padding: '6px 10px'
//                 }}>
//                   {applyResult.errors.map((e, i) => (
//                     <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
//                       <span className="mono" style={{ color: '#f87171' }}>{e.inv}</span>
//                       <span style={{ marginLeft: 8 }}>{e.error}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//           <button className="btn btn-outline" onClick={resetState}>
//             ← Загрузить ещё один файл
//           </button>
//         </div>
//       )}
//     </div>
//   )
// }
