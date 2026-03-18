// components/assets/types.ts

export interface Asset {
  id:                number
  inventoryNumber:   string
  name:              string
  assetType:         string
  barcode:           string | null
  location:          { name: string }
  responsiblePerson: { fullName: string }
  organization:      { name: string }
  employee:          { fullName: string } | null
}

export interface Meta {
  total:      number
  page:       number
  totalPages: number
}

export interface Location {
  id:   number
  name: string
}

export interface Person {
  id:       number
  fullName: string
}