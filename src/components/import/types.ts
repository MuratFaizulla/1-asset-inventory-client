// components/import/types.ts

export type Tab        = 'new' | 'changed' | 'unchanged' | 'orphaned'
export type ImportMode = 'partial' | 'full'

export interface OrphanedAsset {
  id:              number
  inventoryNumber: string
  name:            string
  location:        string
  mol:             string
}

export interface NewAsset {
  inventoryNumber: string
  name:            string
  location:        string
  mol:             string
  employee:        string | null
}

export interface ChangedAsset {
  id:              number
  inventoryNumber: string
  name:            string
  location:        string
  mol:             string
  employee:        string | null
  changes:         { field: string; oldVal: string; newVal: string }[]
}

export interface UnchangedAsset {
  inventoryNumber: string
  name:            string
  location:        string
  mol:             string
  employee:        string | null
}

export interface PreviewResult {
  total:           number
  skipped:         number
  unchanged:       number
  mode:            string
  newAssets:       NewAsset[]
  changedAssets:   ChangedAsset[]
  unchangedAssets: UnchangedAsset[]
  orphaned:        OrphanedAsset[]
}

export interface ApplyResult {
  created:   number
  updated:   number
  unchanged: number
  errors:    { inv: string; error: string }[]
}