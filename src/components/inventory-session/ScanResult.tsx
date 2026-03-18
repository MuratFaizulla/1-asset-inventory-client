import type { ScanResult, AssetItem } from './types'

interface Props {
  lastScan: ScanResult
  scannedBy: string
  session: { items: AssetItem[] }
  cancelling: number | null
  onNext: () => void
  onNextManual: () => void
  onRelocate: (item: AssetItem) => void
  onCancelScan: (itemId: number) => void
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

export default function ScanResultCard({
  lastScan, scannedBy, session, cancelling,
  onNext, onNextManual, onRelocate, onCancelScan,
}: Props) {
  const isAlready = !!lastScan.previousScan

  const borderColor =
    isAlready                         ? '#60a5fa'
    : lastScan.status === 'found'     ? 'var(--accent2)'
    : lastScan.status === 'misplaced' ? 'var(--warn)'
    : 'var(--danger)'

  const bgColor =
    isAlready                         ? '#1e3a5f33'
    : lastScan.status === 'found'     ? '#064e3b33'
    : lastScan.status === 'misplaced' ? '#451a0333'
    : '#450a0a33'

  const titleColor =
    isAlready                         ? '#60a5fa'
    : lastScan.status === 'found'     ? 'var(--accent2)'
    : lastScan.status === 'misplaced' ? 'var(--warn)'
    : 'var(--danger)'

  const title =
    isAlready                         ? '🔄 Уже был отсканирован'
    : lastScan.status === 'found'     ? '✅ Найдено!'
    : lastScan.status === 'misplaced' ? '⚠️ Не на своём месте!'
    : '❌ Не найдено в базе'

  const matchedItem = session.items.find(i => i.asset.id === lastScan.asset?.id)

  return (
    <div style={{
      marginBottom: 16, borderRadius: 14, overflow: 'hidden',
      border: `2px solid ${borderColor}`,
      animation: 'scanPop 0.2s ease',
    }}>
      <div style={{ padding: '16px', background: bgColor }}>

        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: titleColor }}>
          {title}
        </div>

        {lastScan.asset?.name && (
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            {lastScan.asset.name}
          </div>
        )}

        {lastScan.status !== 'not-found' && lastScan.asset && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text3)' }}>
                {lastScan.asset.inventoryNumber}
              </span>
              {lastScan.asset.barcode && (
                <span className="mono" style={{ fontSize: 12, color: 'var(--text3)' }}>
                  📊 {lastScan.asset.barcode}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                📍 {lastScan.asset.location?.name}
              </span>
            </div>
            {lastScan.asset.responsiblePerson && (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                👤 {lastScan.asset.responsiblePerson.fullName}
              </div>
            )}
            {lastScan.asset.employee?.fullName && (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                🧑‍💼 {lastScan.asset.employee.fullName}
              </div>
            )}
            {/* Кто сканирует сейчас — скрываем при повторе */}
            {scannedBy && !isAlready && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                🖊️ {scannedBy}
              </div>
            )}
          </>
        )}

        {lastScan.status === 'not-found' && (
          <span className="mono" style={{ color: 'var(--text3)', fontSize: 13 }}>
            {lastScan.asset?.inventoryNumber}
          </span>
        )}

        {lastScan.status === 'misplaced' && (
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', marginTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>
              По данным 1С числится в:
            </div>
            <div style={{ fontWeight: 600, color: 'var(--warn)', fontSize: 14 }}>
              📍 {lastScan.asset?.location?.name}
            </div>
          </div>
        )}

        {/* Примечание текущего скана — скрываем при повторе */}
        {lastScan.note && !isAlready && (
          <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 8 }}>
            {lastScan.note}
          </div>
        )}

        {/* ── Данные первого сканирования ── */}
        {isAlready && lastScan.previousScan && (
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: '#0c1a2a', borderRadius: 8,
            border: '1px solid #60a5fa33',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600, marginBottom: 2 }}>
              Данные первого сканирования:
            </div>

            {lastScan.previousScan.scannedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text3)', flexShrink: 0 }}>🕐 Время</span>
                <span style={{ color: 'var(--text1)', fontWeight: 500, textAlign: 'right' }}>
                  {fmtDate(lastScan.previousScan.scannedAt)}
                </span>
              </div>
            )}

            {lastScan.previousScan.scannedBy && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text3)', flexShrink: 0 }}>🖊️ Кто сканировал</span>
                <span style={{ color: 'var(--text1)', fontWeight: 500, textAlign: 'right' }}>
                  {lastScan.previousScan.scannedBy}
                </span>
              </div>
            )}

            {lastScan.previousScan.note && (
              <div style={{ fontSize: 12 }}>
                <div style={{ color: 'var(--text3)', marginBottom: 3 }}>📝 Примечание</div>
                <div style={{ color: 'var(--warn)', fontSize: 11, lineHeight: 1.4 }}>
                  {lastScan.previousScan.note}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Кнопки действий */}
        {lastScan.status !== 'not-found' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1, fontWeight: 600, fontSize: 13 }}
              onClick={() => matchedItem && onRelocate(matchedItem)}
            >
              ✏️ Изменить
            </button>
            <button
              className="btn btn-outline"
              style={{ flex: 1, fontSize: 13, color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => matchedItem && onCancelScan(matchedItem.id)}
              disabled={matchedItem ? cancelling === matchedItem.id : false}
            >
              ✕ Отменить скан
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex' }}>
        <button onClick={onNext} style={{
          flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
          background: 'var(--bg3)', color: 'var(--text3)', fontSize: 12,
          borderRight: '1px solid var(--border)',
        }}>Закрыть</button>
        <button onClick={onNextManual} style={{
          flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
          background: 'var(--bg3)', color: 'var(--text2)', fontSize: 12, fontWeight: 600,
        }}>⌨️ Ввести следующий</button>
      </div>
    </div>
  )
}