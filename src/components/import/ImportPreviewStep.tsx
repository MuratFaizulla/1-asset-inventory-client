// components/import/ImportPreviewStep.tsx

import type { PreviewResult, Tab } from './types'
import ChangedAssetsTab  from './tabs/ChangedAssetsTab'
import NewAssetsTab      from './tabs/NewAssetsTab'
import OrphanedTab       from './tabs/OrphanedTab'
import UnchangedAssetsTab from './tabs/UnchangedAssetsTab'
import ErrorBox          from './ui/ErrorBox'
import Spinner           from './ui/Spinner'
import TabBtn            from './ui/TabBtn'

interface Props {
  preview:          PreviewResult
  activeTab:        Tab
  applyChanged:     boolean
  applying:         boolean
  error:            string
  expandedIds:      Set<number>
  searchNew:        string
  searchChanged:    string
  searchUnchanged:  string
  searchOrphaned:   string
  orphanedSelected: Set<number>
  deleting:         boolean
  deletedCount:     number | null
  filteredNew:      PreviewResult['newAssets']
  filteredChanged:  PreviewResult['changedAssets']
  filteredUnchanged:PreviewResult['unchangedAssets']
  filteredOrphaned: PreviewResult['orphaned']
  onTabChange:      (t: Tab) => void
  onApplyChanged:   (v: boolean) => void
  onApply:          () => void
  onToggleExpand:   (id: number) => void
  onToggleAll:      () => void
  onSearchNew:      (v: string) => void
  onSearchChanged:  (v: string) => void
  onSearchUnchanged:(v: string) => void
  onSearchOrphaned: (v: string) => void
  onOrphanToggle:   (id: number) => void
  onOrphanSelectAll:() => void
  onDeleteOrphaned: () => void
}

export default function ImportPreviewStep({
  preview, activeTab, applyChanged, applying, error,
  expandedIds, searchNew, searchChanged, searchUnchanged, searchOrphaned,
  orphanedSelected, deleting, deletedCount,
  filteredNew, filteredChanged, filteredUnchanged, filteredOrphaned,
  onTabChange, onApplyChanged, onApply,
  onToggleExpand, onToggleAll,
  onSearchNew, onSearchChanged, onSearchUnchanged, onSearchOrphaned,
  onOrphanToggle, onOrphanSelectAll, onDeleteOrphaned,
}: Props) {

  const tabCount = (t: Tab) => {
    if (t === 'new')       return preview.newAssets.length
    if (t === 'changed')   return preview.changedAssets.length
    if (t === 'unchanged') return preview.unchangedAssets?.length ?? 0
    return preview.orphaned.length
  }

  return (
    <div>
      {/* Карточки статистики */}
      <div style={{
        display:               'grid',
        gridTemplateColumns:   'repeat(auto-fit, minmax(120px, 1fr))',
        gap:                   10,
        marginBottom:          16,
      }}>
        {[
          { label: 'Всего в файле',  value: preview.total,                        color: 'var(--text1)' },
          { label: '🆕 Новых',       value: preview.newAssets.length,             color: '#4ade80'      },
          { label: '✏️ Изменённых',  value: preview.changedAssets.length,         color: '#facc15'      },
          { label: '➖ Уже в базе',  value: preview.unchangedAssets?.length ?? 0, color: 'var(--text3)' },
          ...(preview.orphaned.length > 0
            ? [{ label: '⚠️ Лишних',    value: preview.orphaned.length, color: '#f87171' }]
            : []
          ),
          ...(preview.skipped > 0
            ? [{ label: '⏭️ Пропущено', value: preview.skipped,         color: 'var(--text3)' }]
            : []
          ),
        ].map(s => (
          <div key={s.label} style={{
            background:   'var(--bg2)',
            border:       '1px solid var(--border)',
            borderRadius: 10,
            padding:      '12px 16px',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'IBM Plex Mono' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Режим */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        fontSize:     12,
        color:        'var(--text3)',
        background:   'var(--bg3)',
        borderRadius: 8,
        padding:      '8px 12px',
        marginBottom: 14,
      }}>
        <span>{preview.mode === 'partial' ? '🔀' : '📋'}</span>
        <span>
          {preview.mode === 'partial'
            ? 'Частичный импорт — лишние ОС не анализируются'
            : 'Полный импорт — показаны все ОС которых нет в файле'
          }
        </span>
      </div>

      {/* Настройки применения */}
      <div style={{
        background:   'var(--bg2)',
        border:       '1px solid var(--border)',
        borderRadius: 12,
        padding:      '14px 18px',
        marginBottom: 14,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>⚙️ Настройки применения</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={applyChanged}
            onChange={e => onApplyChanged(e.target.checked)}
            style={{ accentColor: 'var(--accent2)', width: 16, height: 16 }}
          />
          <span>
            Применить изменения для <strong>{preview.changedAssets.length}</strong> ОС
          </span>
          {!applyChanged && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              (только новые будут добавлены)
            </span>
          )}
        </label>
      </div>

      {error && <ErrorBox msg={error} />}

      {/* Кнопка применить */}
      <div style={{ marginBottom: 18 }}>
        <button
          className="btn btn-primary"
          onClick={onApply}
          disabled={applying}
          style={{ padding: '12px 28px', minWidth: 220, justifyContent: 'center', fontSize: 14 }}
        >
          {applying ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Spinner size={14} /> Применяем...
            </span>
          ) : `✅ Применить (${preview.newAssets.length + (applyChanged ? preview.changedAssets.length : 0)} ОС)`}
        </button>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <TabBtn t="new"       label="🆕 Новые"       color="#4ade80"       activeTab={activeTab} count={tabCount('new')}       onClick={onTabChange} />
        <TabBtn t="changed"   label="✏️ Изменённые"  color="#facc15"       activeTab={activeTab} count={tabCount('changed')}   onClick={onTabChange} />
        <TabBtn t="unchanged" label="➖ Уже в базе"  color="var(--text2)"  activeTab={activeTab} count={tabCount('unchanged')} onClick={onTabChange} />
        {preview.orphaned.length > 0 && (
          <TabBtn t="orphaned" label="⚠️ Лишние" color="#f87171" activeTab={activeTab} count={tabCount('orphaned')} onClick={onTabChange} />
        )}
      </div>

      {/* Контент вкладки */}
      {activeTab === 'new' && (
        <NewAssetsTab
          items={filteredNew}
          total={preview.newAssets.length}
          search={searchNew}
          onSearch={onSearchNew}
        />
      )}
      {activeTab === 'changed' && (
        <ChangedAssetsTab
          items={filteredChanged}
          total={preview.changedAssets.length}
          search={searchChanged}
          onSearch={onSearchChanged}
          expandedIds={expandedIds}
          onToggle={onToggleExpand}
          onToggleAll={onToggleAll}
        />
      )}
      {activeTab === 'unchanged' && (
        <UnchangedAssetsTab
          items={filteredUnchanged}
          total={preview.unchangedAssets?.length ?? 0}
          search={searchUnchanged}
          onSearch={onSearchUnchanged}
        />
      )}
      {activeTab === 'orphaned' && (
        <OrphanedTab
          items={filteredOrphaned}
          total={preview.orphaned.length}
          search={searchOrphaned}
          onSearch={onSearchOrphaned}
          selected={orphanedSelected}
          onToggle={onOrphanToggle}
          onSelectAll={onOrphanSelectAll}
          onDelete={onDeleteOrphaned}
          deleting={deleting}
          deletedCount={deletedCount}
        />
      )}
    </div>
  )
}