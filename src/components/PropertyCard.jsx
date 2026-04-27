// src/components/PropertyCard.jsx
// ─────────────────────────────────────────────────────────────────────
//  Tarjeta de propiedad para mostrar en el catálogo.
//  Recibe un objeto "property" como prop con todos los datos.
// ─────────────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PropertyCard.css';

// Formateador de precios (ej: 250000 → $250,000)
const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(price);

// Íconos por tipo de propiedad
const TYPE_ICONS = {
  Casa:        '🏠',
  Apartamento: '🏢',
  Terreno:     '🌿',
  Comercial:   '🏪',
};

function PropertyCard({ property }) {
  const navigate = useNavigate();

  const goToDetail = () => navigate(`/property/${property.id}`);

  return (
    <article className="prop-card" onClick={goToDetail} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && goToDetail()}
    >
      {/* ── Imagen ── */}
      <div className="prop-card__image-wrap">
        {property.imageUrl ? (
          <img
            src={property.imageUrl}
            alt={property.title}
            className="prop-card__image"
            loading="lazy"
          />
        ) : (
          <div className="prop-card__image-placeholder">
            <span>📷</span>
            <p>Sin imagen</p>
          </div>
        )}

        {/* Badge de tipo */}
        <div className="prop-card__type-badge">
          <span>{TYPE_ICONS[property.type] || '🏠'}</span>
          {property.type}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="prop-card__body">
        {/* Precio */}
        <p className="prop-card__price">{formatPrice(property.price)}</p>

        {/* Título */}
        <h3 className="prop-card__title">{property.title}</h3>

        {/* Ubicación */}
        <p className="prop-card__location">
          <span className="location-icon">📍</span>
          {property.location}
        </p>

        {/* Separador dorado */}
        <div className="prop-card__divider" />

        {/* Características */}
        <div className="prop-card__features">
          {property.bedrooms > 0 && (
            <span className="feature-item" title="Habitaciones">
              <span className="feature-icon">🛏</span>
              {property.bedrooms} hab.
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="feature-item" title="Baños">
              <span className="feature-icon">🚿</span>
              {property.bathrooms} baños
            </span>
          )}
          {property.area > 0 && (
            <span className="feature-item" title="Área">
              <span className="feature-icon">📐</span>
              {property.area} m²
            </span>
          )}
          {property.garage > 0 && (
            <span className="feature-item" title="Garage">
              <span className="feature-icon">🚗</span>
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
