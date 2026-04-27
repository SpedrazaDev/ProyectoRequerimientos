// filepath: src/components/PropertyCard/PropertyCard.tsx
import { Link } from 'react-router-dom'
import { Property } from '../../features/properties/types/property'

interface PropertyCardProps {
  property: Property
}

export const PropertyCard = ({ property }: PropertyCardProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0
    }).format(price)
  }

  return (
    <div className="property-card">
      <div className="property-image">
        {property.images.length > 0 ? (
          <img src={property.images[0]} alt={property.title} />
        ) : (
          <div className="no-image">Sin imagen</div>
        )}
        <span className={`property-badge ${property.type}`}>
          {property.type === 'sale' ? 'Venta' : 'Alquiler'}
        </span>
      </div>
      <div className="property-content">
        <h3 className="property-title">{property.title}</h3>
        <p className="property-location">{property.location}</p>
        <p className="property-price">
          {formatPrice(property.price)}
          {property.type === 'rent' && <span>/mes</span>}
        </p>
        <div className="property-features">
          <span>{property.bedrooms} hab</span>
          <span>{property.bathrooms} baños</span>
          <span>{property.area} m²</span>
        </div>
        <Link to={`/property/${property.id}`} className="property-link">
          Ver detalles
        </Link>
      </div>
    </div>
  )
}