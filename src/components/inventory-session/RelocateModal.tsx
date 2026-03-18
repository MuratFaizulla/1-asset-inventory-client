import { useState } from 'react'
import type { AssetItem, ModalTab, Location, Employee } from './types'

interface Props {
  item: AssetItem
  locations: Location[]
  employees: Employee[]
  onConfirm: (params: {
    locationId?: number
    employeeId?: number
    note?: string
  }) => Promise<void>
  onClose: () => void
}

export default function RelocateModal({
  item,
  locations,
  employees,
  onConfirm,
  onClose,
}: Props) {
  const [modalTab,           setModalTab]           = useState<ModalTab>('location')
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [employeeNote,       setEmployeeNote]       = useState('')
  const [modalSearch,        setModalSearch]        = useState('')
  const [relocating,         setRelocating]         = useState(false)

  const isConfirmDisabled = !selectedLocationId && !selectedEmployeeId && !employeeNote.trim()

  const filteredLocations = locations
    .filter(l => l.id !== item.asset.location.id)
    .filter(l => l.name.toLowerCase().includes(modalSearch.toLowerCase()))

  const filteredEmployees = employees
    .filter(e => e.fullName.toLowerCase().includes(modalSearch.toLowerCase()))

  const handleConfirm = async () => {
    if (isConfirmDisabled) return
    setRelocating(true)
    try {
      await onConfirm({
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
        ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
        ...(employeeNote.trim() ? { note: employeeNote.trim() } : {}),
      })
    } finally {
      setRelocating(false)
    }
  }

  const handleTabChange = (tab: ModalTab) => {
    setModalTab(tab)
    setModalSearch('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480 }}>

        <div className="modal-title">✏️ Изменить данные ОС</div>

        {/* Информация об ОС */}
        <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{item.asset.name}</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
            {item.asset.inventoryNumber}
            {item.asset.barcode && ` · ${item.asset.barcode}`}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--warn)' }}>📍 {item.asset.location.name}</span>
            {item.asset.employee && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>🧑‍💼 {item.asset.employee.fullName}</span>
            )}
          </div>
        </div>

        {/* Табы */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {([
            { key: 'location' as ModalTab, icon: '📍', label: 'Кабинет',   checked: !!selectedLocationId },
            { key: 'employee' as ModalTab, icon: '🧑‍💼', label: 'Сотрудник', checked: !!(selectedEmployeeId || employeeNote.trim()) },
          ]).map(tab => (
            <button key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                background: modalTab === tab.key ? 'var(--bg3)' : 'var(--bg2)',
                color: modalTab === tab.key
                  ? (tab.key === 'location' ? 'var(--accent2)' : 'var(--accent)')
                  : 'var(--text2)',
                border: `1.5px solid ${modalTab === tab.key
                  ? (tab.key === 'location' ? 'var(--accent2)' : 'var(--accent)')
                  : 'var(--border)'}`,
              }}>
              {tab.icon} {tab.label}{tab.checked ? ' ✓' : ''}
            </button>
          ))}
        </div>

        {/* Поиск */}
        <input
          className="input"
          style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
          placeholder={modalTab === 'location' ? '🔍 Поиск кабинета...' : '🔍 Поиск сотрудника...'}
          value={modalSearch}
          onChange={e => setModalSearch(e.target.value)}
        />

        {/* Список */}
        <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {modalTab === 'location'
            ? filteredLocations.length === 0
              ? <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)', fontSize: 13 }}>Ничего не найдено</div>
              : filteredLocations.map(l => (
                  <div key={l.id}
                    onClick={() => setSelectedLocationId(selectedLocationId === l.id ? null : l.id)}
                    style={{
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                      background: selectedLocationId === l.id ? '#0c2a1a' : 'var(--bg3)',
                      border: `1px solid ${selectedLocationId === l.id ? 'var(--accent2)' : 'var(--border)'}`,
                      color: selectedLocationId === l.id ? 'var(--accent2)' : 'var(--text1)',
                      fontWeight: selectedLocationId === l.id ? 600 : 400,
                      transition: 'all 0.1s',
                    }}>
                    {selectedLocationId === l.id ? '✓ ' : ''}{l.name}
                  </div>
                ))
            : filteredEmployees.length === 0
              ? <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)', fontSize: 13 }}>Ничего не найдено</div>
              : filteredEmployees.map(e => (
                  <div key={e.id}
                    onClick={() => setSelectedEmployeeId(selectedEmployeeId === e.id ? null : e.id)}
                    style={{
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                      background: selectedEmployeeId === e.id ? '#0c1a2a' : 'var(--bg3)',
                      border: `1px solid ${selectedEmployeeId === e.id ? 'var(--accent)' : 'var(--border)'}`,
                      color: selectedEmployeeId === e.id ? 'var(--accent)' : 'var(--text1)',
                      fontWeight: selectedEmployeeId === e.id ? 600 : 400,
                      transition: 'all 0.1s',
                    }}>
                    {selectedEmployeeId === e.id ? '✓ ' : ''}{e.fullName}
                  </div>
                ))
          }
        </div>

        {/* Поле заметки (только вкладка сотрудник) */}
        {modalTab === 'employee' && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, fontWeight: 500 }}>
              ✏️ Нет в списке? Напишите вручную:
            </div>
            <textarea
              className="input"
              rows={2}
              style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontSize: 13, fontFamily: 'inherit' }}
              placeholder="Например: Иванов И.И., каб. 305"
              value={employeeNote}
              onChange={e => setEmployeeNote(e.target.value)}
            />
          </div>
        )}

        {/* Итог выбора */}
        {(selectedLocationId || selectedEmployeeId || employeeNote.trim()) && (
          <div style={{
            marginBottom: 10, padding: '10px 14px', borderRadius: 8,
            background: '#0c2a1a', display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Будет сохранено:</div>
            {selectedLocationId && (
              <span style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600 }}>
                📍 → {locations.find(l => l.id === selectedLocationId)?.name}
              </span>
            )}
            {selectedEmployeeId && (
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                🧑‍💼 → {employees.find(e => e.id === selectedEmployeeId)?.fullName}
              </span>
            )}
            {employeeNote.trim() && !selectedEmployeeId && (
              <span style={{ fontSize: 13, color: 'var(--warn)', fontWeight: 600 }}>
                ✏️ {employeeNote.trim()}
              </span>
            )}
          </div>
        )}

        {/* Предупреждение */}
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6 }}>
          ⚠️ Обновится в нашей базе. Не забудьте обновить в 1С.
        </div>

        {/* Кнопки */}
        <div className="modal-actions" style={{ gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1, minHeight: 48 }}
            onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, minHeight: 48, fontSize: 15, opacity: isConfirmDisabled ? 0.4 : 1 }}
            onClick={handleConfirm}
            disabled={isConfirmDisabled || relocating}
          >
            {relocating ? 'Сохраняем...' : '✅ Подтвердить'}
          </button>
        </div>

      </div>
    </div>
  )
}