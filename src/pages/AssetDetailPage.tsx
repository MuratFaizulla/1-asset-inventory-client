// pages/AssetDetailPage.tsx

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { API_BASE } from '../api/client'

import type { Asset, HistoryItem } from '../components/asset-detail/types'
import { photoKey }        from '../components/asset-detail/assetHelpers'
import AssetInfoCard       from '../components/asset-detail/AssetInfoCard'
import AssetFinanceCard    from '../components/asset-detail/AssetFinanceCard'
import AssetHistoryCard    from '../components/asset-detail/AssetHistoryCard'
import AssetPhotoCard      from '../components/asset-detail/AssetPhotoCard'

export default function AssetDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [asset,     setAsset]     = useState<Asset | null>(null)
  const [history,   setHistory]   = useState<HistoryItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [photoUrl,  setPhotoUrl]  = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // ── Загрузка данных ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [assetRes, histRes] = await Promise.all([
          api.get(`/assets/${id}`),
          api.get(`/assets/${id}/history`),
        ])
        setAsset(assetRes.data)
        setHistory(histRes.data)

        // Проверяем фото через список ключей — без 404 ошибок
        const name   = assetRes.data.name as string
        const rawKey = name.trim().toLowerCase().replace(/\s+/g, '_')
        const urlKey = photoKey(name)
        const keysRes = await api.get('/photos')
        if (keysRes.data.includes(rawKey)) {
          setPhotoUrl(`${API_BASE}/api/photos/${urlKey}?t=${Date.now()}`)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── Загрузка фото ─────────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !asset) return
    setUploading(true)
    try {
      const key      = photoKey(asset.name)
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch(`${API_BASE}/api/photos/${key}`, {
        method: 'POST',
        body:   formData,
      })
      if (res.ok) setPhotoUrl(`${API_BASE}/api/photos/${key}?t=${Date.now()}`)
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  // ── Удаление фото ─────────────────────────────────────────────────────────────
  const handlePhotoDelete = async () => {
    if (!asset) return
    const key = photoKey(asset.name)
    await fetch(`${API_BASE}/api/photos/${key}`, { method: 'DELETE' })
    setPhotoUrl(null)
  }

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (loading) return <div className="loading">Загрузка...</div>
  if (!asset)  return <div className="empty"><div>ОС не найдено</div></div>

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Шапка */}
      <div className="page-header">
        <div>
          <button
            className="btn btn-outline"
            style={{ marginBottom: 8, fontSize: 12, padding: '4px 10px' }}
            onClick={() => navigate(-1)}
          >
            ← Назад
          </button>
          <div className="page-title" style={{ maxWidth: 600 }}>{asset.name}</div>
          <div className="page-subtitle">
            <span className="mono">{asset.inventoryNumber}</span>
            {asset.barcode && <span style={{ marginLeft: 12 }}>📊 {asset.barcode}</span>}
          </div>
        </div>
      </div>

      {/* Двухколоночный layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Левая колонка */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AssetInfoCard    asset={asset} />
          <AssetFinanceCard asset={asset} />
          <AssetHistoryCard
            history={history}
            onNavigate={sessionId => navigate(`/inventory/${sessionId}`)}
          />
        </div>

        {/* Правая колонка */}
        <div>
          <AssetPhotoCard
            asset={asset}
            photoUrl={photoUrl}
            uploading={uploading}
            onUpload={handlePhotoUpload}
            onDelete={handlePhotoDelete}
          />
        </div>
      </div>
    </div>
  )
}







// import { useState, useEffect, useRef } from 'react'
// import { useParams, useNavigate } from 'react-router-dom'
// import api, { API_BASE } from '../api/client'

// interface Asset {
//   id: number
//   inventoryNumber: string
//   name: string
//   assetType: string
//   assetFaType: string | null
//   barcode: string | null
//   factoryNumber: string | null
//   accountingAccount: string | null
//   bookValue: number | null
//   residualValue: number | null
//   depreciationPercent: number | null
//   depreciationMonths: number | null
//   depreciationEndYear: number | null
//   acceptanceDate: string | null
//   assignmentDate: string | null
//   location: { id: number; name: string }
//   responsiblePerson: { fullName: string }
//   organization: { name: string }
//   employee: { fullName: string } | null
// }

// interface HistoryItem {
//   id: number
//   status: string
//   note: string | null
//   scannedAt: string | null
//   scannedBy: string | null
//   session: {
//     id: number
//     name: string
//     status: string
//     startedAt: string
//     location: { name: string } | null
//     organization: { name: string } | null
//   }
// }

// const statusLabel: Record<string, string> = {
//   PENDING: 'Не проверен',
//   FOUND: '✅ Найден',
//   NOT_FOUND: '❌ Не найден',
//   MISPLACED: '⚠️ Не на месте',
// }

// const statusBadge: Record<string, string> = {
//   PENDING: 'badge-pending',
//   FOUND: 'badge-found',
//   NOT_FOUND: 'badge-notfound',
//   MISPLACED: 'badge-misplaced',
// }

// // Ключ для фото — по названию ОС (одно фото на все ОС с одинаковым именем)
// const photoKey = (name: string) =>
//   encodeURIComponent(name.trim().toLowerCase().replace(/\s+/g, '_'))

// export default function AssetDetailPage() {
//   const { id } = useParams()
//   const navigate = useNavigate()
//   const [asset, setAsset] = useState<Asset | null>(null)
//   const [history, setHistory] = useState<HistoryItem[]>([])
//   const [loading, setLoading] = useState(true)
//   const [photoUrl, setPhotoUrl] = useState<string | null>(null)
//   const [uploading, setUploading] = useState(false)
//   const fileRef = useRef<HTMLInputElement>(null)

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const [assetRes, histRes] = await Promise.all([
//           api.get(`/assets/${id}`),
//           api.get(`/assets/${id}/history`),
//         ])
//         setAsset(assetRes.data)
//         setHistory(histRes.data)

//         // Проверяем через список ключей — без 404 ошибок
//         const name = assetRes.data.name
//         const rawKey = name.trim().toLowerCase().replace(/\s+/g, '_')
//         const urlKey = photoKey(name)
//         const keysRes = await api.get('/photos')
//         if (keysRes.data.includes(rawKey)) {
//           setPhotoUrl(`${API_BASE}/api/photos/${urlKey}?t=${Date.now()}`)
//         }
//       } catch (e) {
//         console.error(e)
//       } finally {
//         setLoading(false)
//       }
//     }
//     load()
//   }, [id])

//   const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (!file || !asset) return
//     setUploading(true)
//     try {
//       const key = photoKey(asset.name)
//       const formData = new FormData()
//       formData.append('photo', file)
//       const res = await fetch(`${API_BASE}/api/photos/${key}`, {
//         method: 'POST',
//         body: formData,
//       })
//       if (res.ok) setPhotoUrl(`${API_BASE}/api/photos/${key}?t=${Date.now()}`)
//     } catch (e) {
//       console.error(e)
//     } finally {
//       setUploading(false)
//     }
//   }

//   const handlePhotoDelete = async () => {
//     if (!asset) return
//     const key = photoKey(asset.name)
//     await fetch(`${API_BASE}/api/photos/${key}`, { method: 'DELETE' })
//     setPhotoUrl(null)
//   }

//   const fmt = (n: number | null) =>
//     n != null ? n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₸' : '—'

//   const fmtDate = (d: string | null) =>
//     d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

//   const fmtDateTime = (d: string | null) =>
//     d ? new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

//   if (loading) return <div className="loading">Загрузка...</div>
//   if (!asset) return <div className="empty"><div>ОС не найдено</div></div>

//   const deprColor = asset.depreciationPercent == null ? 'var(--text3)'
//     : asset.depreciationPercent >= 100 ? 'var(--danger)'
//     : asset.depreciationPercent >= 50 ? 'var(--warn)'
//     : 'var(--accent2)'

//   return (
//     <div>
//       {/* Header */}
//       <div className="page-header">
//         <div>
//           <button className="btn btn-outline" style={{ marginBottom: 8, fontSize: 12, padding: '4px 10px' }}
//             onClick={() => navigate(-1)}>← Назад</button>
//           <div className="page-title" style={{ maxWidth: 600 }}>{asset.name}</div>
//           <div className="page-subtitle">
//             <span className="mono">{asset.inventoryNumber}</span>
//             {asset.barcode && <span style={{ marginLeft: 12 }}>📊 {asset.barcode}</span>}
//           </div>
//         </div>
//       </div>

//       <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
//         {/* Левая колонка */}
//         <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

//           {/* Основная информация */}
//           <div className="card">
//             <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>📋 Основная информация</div>
//             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//               {[
//                 { label: 'Тип', value: asset.assetType },
//                 { label: 'Тип ФА', value: asset.assetFaType || '—' },
//                 { label: 'Организация', value: asset.organization.name },
//                 { label: 'Местонахождение', value: asset.location.name },
//                 { label: 'МОЛ', value: asset.responsiblePerson.fullName },
//                 { label: 'Сотрудник', value: asset.employee?.fullName || 'Не указан' },
//                 { label: 'Заводской номер', value: asset.factoryNumber || '—' },
//                 { label: 'Счет учета БУ', value: asset.accountingAccount || '—' },
//                 { label: 'Дата принятия', value: fmtDate(asset.acceptanceDate) },
//                 { label: 'Дата закрепления', value: fmtDate(asset.assignmentDate) },
//               ].map(f => (
//                 <div key={f.label} style={{ padding: '10px 12px', background: 'var(--bg3)', borderRadius: 6 }}>
//                   <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
//                     {f.label}
//                   </div>
//                   <div style={{ fontSize: 13 }}>{f.value}</div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Финансы */}
//           <div className="card">
//             <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>💰 Стоимость и износ</div>
//             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
//               {[
//                 { label: 'Стоимость БУ', value: fmt(asset.bookValue), color: 'var(--text)' },
//                 { label: 'Остаточная стоимость', value: fmt(asset.residualValue), color: 'var(--accent2)' },
//                 { label: 'Срок износа', value: asset.depreciationMonths ? `${asset.depreciationMonths} мес.` : '—', color: 'var(--text2)' },
//               ].map(f => (
//                 <div key={f.label} style={{ padding: '12px', background: 'var(--bg3)', borderRadius: 6, textAlign: 'center' }}>
//                   <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{f.label}</div>
//                   <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 600, color: f.color }}>{f.value}</div>
//                 </div>
//               ))}
//             </div>

//             {asset.depreciationPercent != null && (
//               <>
//                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
//                   <span style={{ color: 'var(--text2)' }}>Износ</span>
//                   <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 600, color: deprColor }}>
//                     {asset.depreciationPercent.toFixed(1)}%
//                     {asset.depreciationEndYear && ` · до ${asset.depreciationEndYear}`}
//                   </span>
//                 </div>
//                 <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
//                   <div style={{
//                     height: '100%', borderRadius: 4, background: deprColor,
//                     width: `${Math.min(asset.depreciationPercent, 100)}%`,
//                     transition: 'width 0.5s ease'
//                   }} />
//                 </div>
//               </>
//             )}
//           </div>

//           {/* История инвентаризаций */}
//           <div className="card">
//             <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>📅 История инвентаризаций</div>
//             {history.length === 0 ? (
//               <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
//                 ОС ещё не участвовал в инвентаризациях
//               </div>
//             ) : (
//               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//                 {history.map(h => (
//                   <div
//                     key={h.id}
//                     style={{
//                       padding: '10px 14px', background: 'var(--bg3)',
//                       borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)',
//                       transition: 'border-color 0.15s'
//                     }}
//                     onClick={() => navigate(`/inventory/${h.session.id}`)}
//                     onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
//                     onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
//                   >
//                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
//                       <span style={{ fontWeight: 500, fontSize: 13 }}>{h.session.name}</span>
//                       <span className={`badge ${statusBadge[h.status] || 'badge-pending'}`}>
//                         {statusLabel[h.status] || h.status}
//                       </span>
//                     </div>
//                     <div style={{ fontSize: 12, color: 'var(--text3)' }}>
//                       📍 {h.session.location?.name || h.session.organization?.name || '—'}
//                       {h.scannedAt && ` · ${fmtDateTime(h.scannedAt)}`}
//                       {h.scannedBy && ` · ${h.scannedBy}`}
//                     </div>
//                     {h.note && (
//                       <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 4 }}>
//                         {h.note}
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Правая колонка — фото */}
//         <div>
//           <div className="card" style={{ position: 'sticky', top: 20 }}>
//             <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>📷 Фото</div>

//             {photoUrl ? (
//               <>
//                 <img
//                   src={photoUrl}
//                   alt={asset.name}
//                   style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 280, marginBottom: 10 }}
//                 />
//                 <div style={{ display: 'flex', gap: 8 }}>
//                   <button className="btn btn-outline" style={{ flex: 1, fontSize: 12 }}
//                     onClick={() => fileRef.current?.click()}>
//                     🔄 Заменить
//                   </button>
//                   <button className="btn btn-outline"
//                     style={{ fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }}
//                     onClick={handlePhotoDelete}>
//                     🗑️
//                   </button>
//                 </div>
//               </>
//             ) : (
//               <div
//                 style={{
//                   border: '2px dashed var(--border)', borderRadius: 8,
//                   padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
//                   color: 'var(--text3)', transition: 'border-color 0.15s'
//                 }}
//                 onClick={() => fileRef.current?.click()}
//                 onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)')}
//                 onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')}
//               >
//                 <div style={{ fontSize: 36, marginBottom: 10 }}>📸</div>
//                 <div style={{ fontSize: 13 }}>Нажмите чтобы добавить фото</div>
//                 <div style={{ fontSize: 11, marginTop: 4 }}>.jpg, .png, .webp</div>
//               </div>
//             )}

//             <input
//               ref={fileRef} type="file" accept="image/*"
//               style={{ display: 'none' }} onChange={handlePhotoUpload}
//             />
//             {uploading && (
//               <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>
//                 ⏳ Загрузка...
//               </div>
//             )}

//             {/* Штрих-код / инв. номер */}
//             <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg3)', borderRadius: 8 }}>
//               <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>ШТРИХ-КОД</div>
//               <div className="mono" style={{ fontSize: 14, wordBreak: 'break-all' }}>
//                 {asset.barcode || '—'}
//               </div>
//               <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>ИНВ. НОМЕР</div>
//               <div className="mono" style={{ fontSize: 14 }}>{asset.inventoryNumber}</div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }