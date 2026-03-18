// components/asset-detail/AssetPhotoCard.tsx

import { useRef } from 'react'
import type { Asset } from './types'

interface Props {
  asset:          Asset
  photoUrl:       string | null
  uploading:      boolean
  onUpload:       (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete:       () => void
}

export default function AssetPhotoCard({ asset, photoUrl, uploading, onUpload, onDelete }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="card" style={{ position: 'sticky', top: 20 }}>
      <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>📷 Фото</div>

      {photoUrl ? (
        <>
          <img
            src={photoUrl}
            alt={asset.name}
            style={{
              width:        '100%',
              borderRadius: 8,
              objectFit:    'cover',
              maxHeight:    280,
              marginBottom: 10,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1, fontSize: 12 }}
              onClick={() => fileRef.current?.click()}
            >
              🔄 Заменить
            </button>
            <button
              className="btn btn-outline"
              style={{ fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={onDelete}
            >
              🗑️
            </button>
          </div>
        </>
      ) : (
        <div
          style={{
            border:       '2px dashed var(--border)',
            borderRadius: 8,
            padding:      '40px 20px',
            textAlign:    'center',
            cursor:       'pointer',
            color:        'var(--text3)',
            transition:   'border-color 0.15s',
          }}
          onClick={() => fileRef.current?.click()}
          onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)')}
          onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>📸</div>
          <div style={{ fontSize: 13 }}>Нажмите чтобы добавить фото</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>.jpg, .png, .webp</div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onUpload}
      />

      {uploading && (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>
          ⏳ Загрузка...
        </div>
      )}

      {/* Коды */}
      <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg3)', borderRadius: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>ШТРИХ-КОД</div>
        <div className="mono" style={{ fontSize: 14, wordBreak: 'break-all' }}>
          {asset.barcode || '—'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>ИНВ. НОМЕР</div>
        <div className="mono" style={{ fontSize: 14 }}>{asset.inventoryNumber}</div>
      </div>
    </div>
  )
}