// filepath: src/pages/PropertyDetail/PropertyDetail.tsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPropertyById } from '../../features/properties/services/propertyService'
import { Property } from '../../features/properties/types/property'

export const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    const loadProperty = async () => {
      if (!id) return
      try {
        const data = await getPropertyById(id)
        setProperty(data)
      } catch (error) {
        console.error('Error loading property:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProperty()
  }, [id])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0
    }).format(price)
  }

  if (loading) return <div className="loading">Cargando...</div>
  if (!property) return <div className="error">Propiedad no encontrada</div>

  return (
    <div className="property-detail-page">
      <Link to="/catalog" className="back-link">← Volver al catálogo</Link>
      
      <div className="property-gallery">
        {property.images.length > 0 ? (
          <>
            <img 
              src={property.images[currentImage]} 
              alt={property.title} 
              className="main-image"
            />
            {property.images.length > 1 && (
              <div className="thumbnail-list">
                {property.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImage(index)}
                    className={index === currentImage ? 'active' : ''}
                  >
                    <img src={img} alt={`${property.title} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="no-image">Sin imágenes disponibles</div>
        )}
      </div>

      <div className="property-info">
        <div className="property-header">
          <h1>{property.title}</h1>
          <span className={`badge ${property.type}`}>
            {property.type === 'sale' ? 'Venta' : 'Alquiler'}
          </span>
        </div>
        
        <p className="property-location">{property.location}</p>
        <p className="property-price">
          {formatPrice(property.price)}
          {property.type === 'rent' && <span>/mes</span>}
        </p>

        <div className="property-specs">
          <div className="spec">
            <span className="label">Habitaciones</span>
            <span className="value">{property.bedrooms}</span>
          </div>
          <div className="spec">
            <span className="label">Baños</span>
            <span className="value">{property.bathrooms}</span>
          </div>
          <div className="spec">
            <span className="label">Área</span>
            <span className="value">{property.area} m²</span>
          </div>
          <div className="spec">
            <span className="label">Tipo</span>
            <span className="value">{property.propertyType}</span>
          </div>
        </div>

        <div className="property-description">
          <h2>Descripción</h2>
          <p>{property.description}</p>
        </div>

        {property.features.length > 0 && (
          <div className="property-features">
            <h2>Características</h2>
            <ul>
              {property.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="property-address">
          <h2>Dirección</h2>
          <p>{property.address}</p>
        </div>

        <div className="property-actions">
          <button className="btn-primary">Contactar</button>
          <button className="btn-secondary">Agendar visita</button>
        </div>
      </div>
    </div>
  )
}