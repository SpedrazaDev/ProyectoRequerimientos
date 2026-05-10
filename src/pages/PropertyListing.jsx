// src/pages/PropertyListing.jsx
// Catálogo público con paginación y ordenamiento
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, SlidersHorizontal, Grid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './PropertyListing.css';

const ITEMS_PER_PAGE = 10;

function PropertyListing() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // ← NUEVO: Ordenamiento
  const [sortBy, setSortBy] = useState('newest');
  
  // ← NUEVO: Paginación
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Suscripción en tiempo real
    const unsubscribe = onSnapshot(
      query(collection(db, 'properties'), where('status', '==', 'disponible')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProperties(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error cargando propiedades:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtrado
  const filteredProperties = useMemo(() => {
    let filtered = properties;

    // Búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(term) ||
        p.location?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    // Filtro por tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.type === selectedType);
    }

    // Filtro por precio
    if (priceRange.min) {
      filtered = filtered.filter(p => p.price >= Number(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(p => p.price <= Number(priceRange.max));
    }

    return filtered;
  }, [properties, searchTerm, selectedType, priceRange]);

  // ← NUEVO: Ordenamiento
  const sortedProperties = useMemo(() => {
    const sorted = [...filteredProperties];

    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      case 'oldest':
        return sorted.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateA - dateB;
        });
      case 'area-desc':
        return sorted.sort((a, b) => (b.area || 0) - (a.area || 0));
      default:
        return sorted;
    }
  }, [filteredProperties, sortBy]);

  // ← NUEVO: Paginación
  const totalPages = Math.ceil(sortedProperties.length / ITEMS_PER_PAGE);
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return sortedProperties.slice(start, end);
  }, [sortedProperties, currentPage]);

  // Reset página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType, priceRange, sortBy]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);

  if (loading) {
    return (
      <div className="listing-page">
        <div className="loading-container">
          <div className="spinner" />
          <p>Cargando propiedades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="listing-page">
      <div className="listing-container">

        {/* Header */}
        <div className="listing-header">
          <div>
            <h1 className="listing-title">Propiedades Disponibles</h1>
            <p className="listing-subtitle">
              {sortedProperties.length} propiedad{sortedProperties.length !== 1 ? 'es' : ''} encontrada{sortedProperties.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Vista */}
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={20} />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="filters-section">
          
          {/* Búsqueda */}
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Buscar por ubicación, título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tipo */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos los tipos</option>
            <option value="casa">Casa</option>
            <option value="apartamento">Apartamento</option>
            <option value="lote">Lote</option>
            <option value="comercial">Comercial</option>
          </select>

          {/* Precio min */}
          <input
            type="number"
            placeholder="Precio mínimo"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
            className="filter-input"
          />

          {/* Precio max */}
          <input
            type="number"
            placeholder="Precio máximo"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="filter-input"
          />

          {/* ← NUEVO: Ordenamiento */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select sort-select"
          >
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguas</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="area-desc">Mayor área</option>
          </select>
        </div>

        {/* ← NUEVO: Info de paginación */}
        {sortedProperties.length > 0 && (
          <div className="results-info">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedProperties.length)} de {sortedProperties.length}
          </div>
        )}

        {/* Resultados */}
        {paginatedProperties.length === 0 ? (
          <div className="empty-state">
            <SlidersHorizontal size={48} strokeWidth={1.5} />
            <h3>No se encontraron propiedades</h3>
            <p>Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className={`properties-${viewMode}`}>
            {paginatedProperties.map(property => (
              <Link
                key={property.id}
                to={`/property/${property.id}`}
                className={`property-card property-card--${viewMode}`}
              >
                <div className="property-image">
                  {property.imageUrls?.[0] ? (
                    <img src={property.imageUrls[0]} alt={property.title} />
                  ) : (
                    <div className="image-placeholder">Sin imagen</div>
                  )}
                  <span className="property-type">{property.type}</span>
                </div>

                <div className="property-info">
                  <h3 className="property-title">{property.title}</h3>
                  <p className="property-location">📍 {property.location}</p>
                  <p className="property-price">{formatPrice(property.price)}</p>

                  <div className="property-features">
                    {property.bedrooms && <span>🛏️ {property.bedrooms}</span>}
                    {property.bathrooms && <span>🚿 {property.bathrooms}</span>}
                    {property.area && <span>📐 {property.area} m²</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ← NUEVO: Paginación */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={20} />
              Anterior
            </button>

            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`page-number ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="page-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight size={20} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default PropertyListing;
