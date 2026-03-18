// components/asset-detail/types.ts

export interface Asset {
  id:                  number
  inventoryNumber:     string
  name:                string
  assetType:           string
  assetFaType:         string | null
  barcode:             string | null
  factoryNumber:       string | null
  accountingAccount:   string | null
  bookValue:           number | null
  residualValue:       number | null
  depreciationPercent: number | null
  depreciationMonths:  number | null
  depreciationEndYear: number | null
  acceptanceDate:      string | null
  assignmentDate:      string | null
  location:            { id: number; name: string }
  responsiblePerson:   { fullName: string }
  organization:        { name: string }
  employee:            { fullName: string } | null
}

export interface HistoryItem {
  id:        number
  status:    string
  note:      string | null
  scannedAt: string | null
  scannedBy: string | null
  session: {
    id:           number
    name:         string
    status:       string
    startedAt:    string
    location:     { name: string } | null
    organization: { name: string } | null
  }
}