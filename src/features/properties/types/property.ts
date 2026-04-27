// filepath: src/features/properties/types/property.ts
export interface Property {
  id: string
  title: string
  description: string
  price: number
  location: string
  address: string
  bedrooms: number
  bathrooms: number
  area: number
  images: string[]
  type: 'sale' | 'rent'
  propertyType: 'house' | 'apartment' | 'land' | 'commercial'
  status: 'available' | 'sold' | 'rented'
  features: string[]
  createdAt: Date
  updatedAt: Date
}

export interface PropertyFilter {
  type?: 'sale' | 'rent'
  propertyType?: 'house' | 'apartment' | 'land' | 'commercial'
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  maxBedrooms?: number
  location?: string
}