// components/import/ImportUploadStep.tsx

import { useRef } from 'react'
import type { ImportMode } from './types'
import ErrorBox from './ui/ErrorBox'
import Spinner  from './ui/Spinner'

interface Props {
  file:          File | null
  loading:       boolean
  elapsed:       number
  error:         string
  importMode:    ImportMode
  onFile:        (f: File) => void
  onClearFile:   () => void
  onModeChange:  (m: ImportMode) => void
  onAnalyze:     () => void
}

export default function ImportUploadStep({
  file, loading, elapsed, error,
  importMode, onFile, onClearFile, onModeChange, onAnalyze,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Зона загрузки */}
      <div
        className="card"
        style={{
          borderStyle: 'dashed',
          borderColor: file ? 'var(--accent2)' : 'var(--border)',
          textAlign:   'center',
          padding:     '44px 24px',
          cursor:      'pointer',
          marginBottom: 14,
          transition:  'border-color .2s',
        }}
        onClick={() => inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
        onDragOver={e => e.preventDefault()}
      >
        <div style={{ fontSize: 40, marginBottom: 14 }}>{file ? '✅' : '📄'}</div>
        {file ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {(file.size / 1024).toFixed(1)} KB
              <button
                onClick={e => { e.stopPropagation(); onClearFile() }}
                style={{
                  marginLeft: 10, background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--danger)', fontSize: 12,
                }}
              >
                ✕ убрать
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>
              Перетащите файл или нажмите для выбора
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              .xlsx, .xls — выгрузка ОС из 1С
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
      </div>

      {/* Режим импорта */}
      <div style={{
        background:    'var(--bg2)',
        border:        '1px solid var(--border)',
        borderRadius:  10,
        padding:       '14px 18px',
        marginBottom:  14,
      }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Режим импорта</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([
            {
              value:    'partial' as ImportMode,
              label:    'Частичный импорт',
              hint:     'Файл содержит часть ОС. Добавить/обновить только их. Остальные не трогать.',
            },
            {
              value:    'full' as ImportMode,
              label:    'Полный импорт',
              hint:     'Файл содержит ВСЕ ОС организации. Показать ОС которых нет в файле как "лишние".',
            },
          ]).map(m => (
            <label key={m.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="radio"
                name="importMode"
                value={m.value}
                checked={importMode === m.value}
                onChange={() => onModeChange(m.value)}
                style={{ marginTop: 3, accentColor: 'var(--accent2)', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{m.hint}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {error && <ErrorBox msg={error} />}

      <button
        className="btn btn-primary"
        onClick={onAnalyze}
        disabled={!file || loading}
        style={{ width: '100%', justifyContent: 'center', padding: '13px 0', fontSize: 14 }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <Spinner />
            Анализируем файл... {elapsed > 0 && `(${elapsed}с)`}
          </span>
        ) : '🔍 Анализировать файл'}
      </button>
    </div>
  )
}