// components/asset-detail/AssetInfoCard.tsx

import type { Asset } from './types'
import { fmtDate } from './assetHelpers'

interface Props {
  asset: Asset
}

export default function AssetInfoCard({ asset }: Props) {
  const fields = [
    { label: 'Тип',               value: asset.assetType },
    { label: 'Тип ФА',            value: asset.assetFaType || '—' },
    { label: 'Организация',       value: asset.organization.name },
    { label: 'Местонахождение',   value: asset.location.name },
    { label: 'МОЛ',               value: asset.responsiblePerson.fullName },
    { label: 'Сотрудник',         value: asset.employee?.fullName || 'Не указан' },
    { label: 'Заводской номер',   value: asset.factoryNumber || '—' },
    { label: 'Счет учета БУ',     value: asset.accountingAccount || '—' },
    { label: 'Дата принятия',     value: fmtDate(asset.acceptanceDate) },
    { label: 'Дата закрепления',  value: fmtDate(asset.assignmentDate) },
  ]

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>📋 Основная информация</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {fields.map(f => (
          <div key={f.label} style={{ padding: '10px 12px', background: 'var(--bg3)', borderRadius: 6 }}>
            <div style={{
              fontSize:       11,
              color:          'var(--text3)',
              textTransform:  'uppercase',
              letterSpacing:  '0.05em',
              marginBottom:   4,
            }}>
              {f.label}
            </div>
            <div style={{ fontSize: 13 }}>{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}