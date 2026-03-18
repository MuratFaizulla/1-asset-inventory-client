import { useRef } from 'react'

interface Props {
  scannedBy: string
  onScannedByChange: (value: string) => void
  manualInput: string
  onManualInputChange: (value: string) => void
  onManualScan: () => void
  onCameraCapture: (e: React.ChangeEvent<HTMLInputElement>) => void
  submitting: boolean
  scannerActive: boolean
}

export default function ScannerBlock({
  scannedBy,
  onScannedByChange,
  manualInput,
  onManualInputChange,
  onManualScan,
  onCameraCapture,
  submitting,
  scannerActive,
}: Props) {
  const manualRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handleManualKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onManualScan()
      manualRef.current?.focus()
    }
  }

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, marginBottom: 16, overflow: 'hidden',
    }}>
      {/* Кто сканирует */}
      <div style={{ padding: '12px 14px 0' }}>
        <input
          className="input"
          style={{ width: '100%', minHeight: 44, boxSizing: 'border-box' }}
          placeholder="👤 Кто сканирует (ФИО)..."
          value={scannedBy}
          onChange={e => onScannedByChange(e.target.value)}
        />
      </div>

      {/* Скрытый input для камеры */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={onCameraCapture}
      />

      {/* Кнопка камеры */}
      {!submitting
        ? (
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={scannerActive}
            style={{
              width: '100%', padding: '20px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #1e3a5f, #0f2540)',
              color: 'white', fontSize: 18, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              marginTop: 12, WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 30 }}>{scannerActive ? '⏳' : '📷'}</span>
            {scannerActive ? 'Распознаём...' : 'Сканировать камерой'}
          </button>
        ) : (
          <div style={{
            padding: '20px', textAlign: 'center',
            background: 'var(--bg3)', color: 'var(--text3)',
            fontSize: 14, marginTop: 12,
          }}>
            ⏳ Отправляем...
          </div>
        )
      }

      {/* Ручной ввод */}
      <div style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
        <input
          ref={manualRef}
          className="input"
          style={{ flex: 1, minHeight: 46, fontSize: 15 }}
          placeholder="⌨️ Инв. номер или штрих-код..."
          value={manualInput}
          onChange={e => onManualInputChange(e.target.value)}
          onKeyDown={handleManualKeyDown}
          inputMode="numeric"
        />
        <button
          className="btn btn-primary"
          style={{ minWidth: 56, minHeight: 46, fontSize: 20, padding: '0 14px' }}
          onClick={onManualScan}
          disabled={!manualInput.trim() || submitting}
        >
          ✓
        </button>
      </div>
    </div>
  )
}