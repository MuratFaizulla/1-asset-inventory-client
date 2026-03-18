// components/assets/AssetsTable.tsx

import type { Asset, Meta } from './types'

interface Props {
  assets:   Asset[]
  meta:     Meta
  onSelect: (id: number) => void
}

export default function AssetsTable({ assets, meta, onSelect }: Props) {
  return (
    <div className="table-wrap desktop-only">
      <table>
        <thead>
          <tr>
            <th style={{ width: 48, textAlign: 'center', color: 'var(--text3)' }}>#</th>
            <th>Инв. номер</th>
            <th>Наименование</th>
            <th>Местонахождение</th>
            <th>МОЛ</th>
            <th>Сотрудник</th>
            <th>Штрих-код</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a, i) => (
            <tr
              key={a.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(a.id)}
            >
              <td style={{
                textAlign:  'center',
                color:      'var(--text3)',
                fontSize:   12,
                fontFamily: 'IBM Plex Mono',
              }}>
                {(meta.page - 1) * 200 + i + 1}
              </td>
              <td><span className="mono">{a.inventoryNumber}</span></td>
              <td style={{ maxWidth: 240 }}>{a.name}</td>
              <td style={{ color: 'var(--text2)', fontSize: 12 }}>{a.location.name}</td>
              <td style={{ color: 'var(--text2)', fontSize: 12 }}>
                {a.responsiblePerson.fullName.split(' ').slice(0, 2).join(' ')}
              </td>
              <td style={{ color: 'var(--text2)', fontSize: 12 }}>
                {a.employee
                  ? a.employee.fullName.split(' ').slice(0, 2).join(' ')
                  : '—'
                }
              </td>
              <td><span className="mono">{a.barcode || '—'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}