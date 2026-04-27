// filepath: src/pages/Catalog/Catalog.tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PropertyCard } from '../../components/PropertyCard'
import { getProperties } from '../../features/properties/services/propertyService'
import { Property, PropertyFilter } from '../../features/properties/types/property'

export const Catalog = () => {
  const [searchParams] = useSearchParams()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PropertyFilter>({})

  useEffect(() => {
    const type = searchParams.get('type') as 'sale' | 'rent' | null
    const propertyType = searchParams.get('propertyType') as PropertyFilter['propertyType']
    
    const newFilter: PropertyFilter = {}
    if (type) newFilter.type = type
    if (propertyType) newFilter.propertyType = propertyType
    
    setFilter(newFilter)
  }, [searchParams])

  useEffect(() => {
    const loadProperties = async () => {
      setLoading(true)
      try {
        const data = await getProperties(filter)
        setProperties(data)
      } catch (error) {
        console.error('Error loading properties:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProperties()
  }, [filter])

  const getTitle = () => {
    if (filter.type === 'sale') return 'Propiedades en Venta'
    if (filter.type === 'rent') return 'Propiedades en Alquiler'
    if (filter.propertyType) {
      const types: Record<string, string> = {
        house: 'Casas',
        apartment: 'Apartamentos',
        land: 'Terrenos',
        commercial: 'Comercial'
      }
      return types[filter.propertyType]
    }
    return 'Catálogo de Propiedades'
  }

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <h1>{getTitle()}</h1>
        <p>{properties.length} propiedades encontradas</p>
      </div>

      <div className="catalog-filters">
        <select 
          value={filter.type || ''} 
          onChange={(e) => setFilter({ ...filter, type: e.target.value as any || undefined })}
        >
          <option value="">Todos los tipos</option>
          <option value="sale">Venta</option>
          <option value="rent">Alquiler</option>
        </select>
        
        <select
          value={filter.propertyType || ''}
          onChange={(e) => setFilter({ ...filter, propertyType: e.target.value as any || undefined })}
        >
          <option value="">Todas las categorías</option>
          <option value="house">Casas</option>
          <option value="apartment">Apartamentos</option>
          <option value="land">Terrenos</option>
          <option value="commercial">Comercial</option>
        </select>
      </div>

      {loading ? (
        <p className="loading">Cargando propiedades...</p>
      ) : properties.length > 0 ? (
        <div className="properties-grid">
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <p>No se encontraron propiedades con los filtros seleccionados</p>
        </div>
      )}
    </div>
  )
}