// components/import/tabs/NewAssetsTab.tsx

import type { NewAsset } from '../import/types'
import AssetTable  from '../ui/AssetTable'
import SearchInput from '../ui/SearchInput'

interface Props {
  items:    NewAsset[]
  total:    number
  search:   string
  onSearch: (v: string) => void
}

export default function NewAssetsTab({ items, total, search, onSearch }: Props) {
  return (
    <>
      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder="Поиск по названию, номеру, кабинету, сотруднику..."
      />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding:       '8px 12px',
          background:    'var(--bg3)',
          fontSize:      11,
          color:         'var(--text3)',
          borderBottom:  '1px solid var(--border)',
        }}>
          Показано: {items.length} из {total}
        </div>
        <AssetTable
          items={items}
          emptyText={search ? 'Ничего не найдено' : 'Нет новых ОС'}
        />
      </div>
    </>
  )
}