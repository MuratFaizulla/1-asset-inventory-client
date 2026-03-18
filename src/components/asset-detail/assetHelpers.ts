// components/asset-detail/assetHelpers.ts

export const statusLabel: Record<string, string> = {
  PENDING:   'Не проверен',
  FOUND:     '✅ Найден',
  NOT_FOUND: '❌ Не найден',
  MISPLACED: '⚠️ Не на месте',
}

export const statusBadge: Record<string, string> = {
  PENDING:   'badge-pending',
  FOUND:     'badge-found',
  NOT_FOUND: 'badge-notfound',
  MISPLACED: 'badge-misplaced',
}

/** Ключ для хранения фото — по нормализованному имени ОС */
export const photoKey = (name: string) =>
  encodeURIComponent(name.trim().toLowerCase().replace(/\s+/g, '_'))

export const fmt = (n: number | null) =>
  n != null
    ? n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₸'
    : '—'

export const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

export const fmtDateTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString('ru-RU', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

export const deprColor = (pct: number | null) => {
  if (pct == null)   return 'var(--text3)'
  if (pct >= 100)    return 'var(--danger)'
  if (pct >= 50)     return 'var(--warn)'
  return 'var(--accent2)'
}