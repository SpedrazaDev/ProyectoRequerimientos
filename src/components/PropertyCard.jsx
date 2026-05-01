// src/components/PropertyCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Building2, Trees, Store, Bed, Bath, Maximize, Car, MapPin } from 'lucide-react';
import './PropertyCard.css';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(price);

const TYPE_ICONS = {
  Casa:        <Home size={16} />,
  Apartamento: <Building2 size={16} />,
  Terreno:     <Trees size={16} />,
  Comercial:   <Store size={16} />,
};

function PropertyCard({ property }) {
  const navigate = useNavigate();

  const goToDetail = () => navigate(`/property/${property.id}`);

  return (
    <article className="prop-card" onClick={goToDetail} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && goToDetail()}
    >
      {/* Imagen */}
      <div className="prop-card__image-wrap">
        {property.imageUrl ? (
          <img
            src={property.imageUrl}
            alt={property.title}
            className="prop-card__image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="prop-card__image-placeholder">
            <Home size={48} strokeWidth={1.5} />
            <p>Sin imagen</p>
          </div>
        )}

        {/* Badge de tipo */}
        <div className="prop-card__type-badge">
          {TYPE_ICONS[property.type] || <Home size={16} />}
          {property.type}
        </div>
      </div>

      {/* Contenido */}
      <div className="prop-card__body">
        <p className="prop-card__price">{formatPrice(property.price)}</p>
        <h3 className="prop-card__title">{property.title}</h3>

        <p className="prop-card__location">
          <MapPin size={14} />
          {property.location}
        </p>

        <div className="prop-card__divider" />

        {/* Características */}
        <div className="prop-card__features">
          {property.bedrooms > 0 && (
            <span className="feature-item" title="Habitaciones">
              <Bed size={14} />
              {property.bedrooms} hab.
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="feature-item" title="Baños">
              <Bath size={14} />
              {property.bathrooms} baños
            </span>
          )}
          {property.area > 0 && (
            <span className="feature-item" title="Área">
              <Maximize size={14} />
              {property.area} m²
            </span>
          )}
          {property.garage > 0 && (
            <span className="feature-item" title="Garage">
              <Car size={14} />
              {property.garage} gar.
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="prop-card__footer">
          <span className="prop-card__cta">Ver detalles →</span>
        </div>
      </div>
    </article>
  );
}

export default PropertyCard;
