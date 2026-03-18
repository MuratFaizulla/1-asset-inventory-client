// ─── Enums / Unions ───────────────────────────────────────────────────────────

export type ItemStatus = 'PENDING' | 'FOUND' | 'NOT_FOUND' | 'MISPLACED'
export type ModalTab   = 'location' | 'employee'
export type SortCol    = 'inventoryNumber' | 'name' | 'status' | 'scannedAt'

// ─── Domain interfaces ────────────────────────────────────────────────────────

export interface AssetItem {
  id: number
  status: ItemStatus
  scannedAt: string | null
  scannedBy: string | null
  note: string | null
  asset: {
    id: number
    inventoryNumber: string
    name: string
    barcode: string | null
    location: { id: number; name: string }
    responsiblePerson: { id: number; fullName: string }
    employee: { id: number; fullName: string } | null
  }
}

export interface Session {
  id: number
  name: string
  status: string
  createdBy: string | null
  locationId: number | null
  location: { id: number; name: string } | null
  stats: {
    total: number
    found: number
    notFound: number
    misplaced: number
    pending: number
  }
  items: AssetItem[]
}

// Данные первого сканирования (возвращаются при alreadyScanned)
export interface PreviousScan {
  scannedAt: string | null
  scannedBy: string | null
  note: string | null
}

export interface ScanResult {
  asset: {
    id?: number
    name?: string
    inventoryNumber?: string
    barcode?: string | null
    location?: { id: number; name: string }
    responsiblePerson?: { id: number; fullName: string }
    employee?: { id: number; fullName: string } | null
  } | null
  status: 'found' | 'not-found' | 'misplaced'
  note?: string
  previousScan?: PreviousScan | null
}

export interface Location {
  id: number
  name: string
}

export interface Employee {
  id: number
  fullName: string
}

export interface HistoryEntry {
  id: string
  barcode: string
  status: string
  name: string
  time: string
}

// ─── Status constants ─────────────────────────────────────────────────────────

export const STATUS_COLOR: Record<ItemStatus, string> = {
  FOUND:     'var(--accent2)',
  MISPLACED: 'var(--warn)',
  NOT_FOUND: 'var(--danger)',
  PENDING:   'var(--text3)',
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  FOUND:     '✅ Найден',
  MISPLACED: '⚠️ Не на месте',
  NOT_FOUND: '❌ Не найден',
  PENDING:   'Не проверен',
}

export const STATUS_BADGE: Record<ItemStatus, string> = {
  FOUND:     'badge-found',
  MISPLACED: 'badge-misplaced',
  NOT_FOUND: 'badge-notfound',
  PENDING:   'badge-pending',
}



// Добавьте/замените в components/inventory-session/types.ts

export type PendingAsset = {
  id:              number
  name:            string
  inventoryNumber: string
  barcode:         string | null
}


export type AssetInfo = {
  id:                number
  itemId:            number
  name:              string
  inventoryNumber:   string
  barcode:           string | null
  responsiblePerson: string | null
  employee:          string | null
  scannedAt:         string | null
  scannedBy:         string | null
  note:              string | null
}

export type LocationStat = {
  locationId:      number
  locationName:    string
  total:           number
  found:           number
  notFound:        number
  misplaced:       number
  pending:         number
  progress:        number
  totalAssets:     AssetInfo[]
  foundAssets:     AssetInfo[]
  notFoundAssets:  AssetInfo[]
  misplacedAssets: AssetInfo[]
  pendingAssets:   AssetInfo[]
}