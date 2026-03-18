// components/assets/AssetsPagination.tsx

import type { Meta } from './types'

interface Props {
  meta:      Meta
  page:      number
  onFirst:   () => void
  onPrev:    () => void
  onNext:    () => void
  onLast:    () => void
}

export default function AssetsPagination({ meta, page, onFirst, onPrev, onNext, onLast }: Props) {
  const from = (meta.page - 1) * 200 + 1
  const to   = Math.min(meta.page * 200, meta.total)

  return (
    <div className="pagination">
      <span style={{ fontSize: 13, color: 'var(--text3)', marginRight: 'auto' }}>
        {from}–{to} из {meta.total}
      </span>
      <button className="btn btn-outline" disabled={page === 1}              onClick={onFirst}>«</button>
      <button className="btn btn-outline" disabled={page === 1}              onClick={onPrev}>←</button>
      <span style={{ fontSize: 13 }}>{meta.page} / {meta.totalPages}</span>
      <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={onNext}>→</button>
      <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={onLast}>»</button>
    </div>
  )
}