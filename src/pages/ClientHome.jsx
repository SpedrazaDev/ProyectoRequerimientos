// src/pages/ClientHome.jsx
// ACTUALIZADO: Con paginación (10 propiedades por página) y ordenamiento
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import './ClientHome.css';

const EMPTY_FILTERS = {
  type:     '',
  minPrice: '',
  maxPrice: '',
  bedrooms: '',
  search:   '',
};

const ITEMS_PER_PAGE = 10; // ← PAGINACIÓN

function ClientHome() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent'); // ← ORDENAMIENTO

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // Solo cargar propiedades DISPONIBLES
        const q = query(
          collection(db, 'properties'),
          where('status', '==', 'disponible'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProperties(data);
      } catch (err) {
        try {
          // Fallback sin índice
          const snapshot = await getDocs(collection(db, 'properties'));
          const data = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.status === 'disponible' || !p.status);
          setProperties(data);
        } catch (err2) {
          setError('Error al cargar propiedades.');
          console.error(err2);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  // Filtrar
  const filtered = useMemo(() => {
    return properties.filter(p => {
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matches =
          p.title?.toLowerCase().includes(term) ||
          p.location?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      if (filters.type && p.type !== filters.type) return false;
      if (filters.minPrice && p.price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && p.price > Number(filters.maxPrice)) return false;
      if (filters.bedrooms && p.bedrooms !== Number(filters.bedrooms)) return false;

      return true;
    });
  }, [properties, filters]);

  // Ordenar
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === 'price-asc') {
      arr.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      arr.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'recent') {
      arr.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
    }
    return arr;
  }, [filtered, sortBy]);

  // Paginar
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProperties = sorted.slice(startIndex, endIndex);

  const handleFilter = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Volver a primera página al filtrar
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="client-home">

      {/* HERO */}
      <section className="hero">
        <div className="hero__overlay" />
        <div className="hero__content">
          <p className="hero__tag">Bienes Raíces Premium</p>
          <h1 className="hero__title">
            Encuentra el hogar<br />
            <em>que mereces</em>
          </h1>
          <p className="hero__subtitle">
            Propiedades exclusivas cuidadosamente seleccionadas para ti.
          </p>

          <div className="hero__search">
            <input
              type="text"
              name="search"
              placeholder="Buscar por nombre, ciudad o descripción..."
              value={filters.search}
              onChange={handleFilter}
              className="hero__search-input"
            />
            <button className="hero__search-btn">
              <Search size={18} />
              Buscar
            </button>
          </div>
        </div>
      </section>

      {/* FILTROS */}
      <section className="filters-bar">
        <div className="filters-bar__inner">
          <span className="filters-bar__label">Filtrar:</span>

          <select name="type" value={filters.type} onChange={handleFilter} className="filter-select">
            <option value="">Todos los tipos</option>
            <option value="Casa">Casa</option>
            <option value="Apartamento">Apartamento</option>
            <option value="Terreno">Terreno</option>
            <option value="Comercial">Comercial</option>
          </select>

          <select name="bedrooms" value={filters.bedrooms} onChange={handleFilter} className="filter-select">
            <option value="">Habitaciones</option>
            <option value="1">1 hab.</option>
            <option value="2">2 hab.</option>
            <option value="3">3 hab.</option>
            <option value="4">4 hab.</option>
            <option value="5">5+ hab.</option>
          </select>

          <input
            type="number"
            name="minPrice"
            placeholder="Precio mín. ($)"
            value={filters.minPrice}
            onChange={handleFilter}
            className="filter-input"
            min="0"
          />

          <input
            type="number"
            name="maxPrice"
            placeholder="Precio máx. ($)"
            value={filters.maxPrice}
            onChange={handleFilter}
            className="filter-input"
            min="0"
          />

          {/* ← ORDENAMIENTO */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="recent">Más recientes</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
          </select>

          {Object.values(filters).some(Boolean) && (
            <button className="filter-clear" onClick={clearFilters}>
              ✕ Limpiar
            </button>
          )}
        </div>
      </section>

      {/* CATÁLOGO */}
      <section className="catalog-section">
        <div className="catalog-section__header">
          <h2 className="catalog-section__title">
            {filters.search ? `Resultados para "${filters.search}"` : 'Propiedades disponibles'}
          </h2>
          <span className="catalog-section__count">
            {loading ? '...' : `${sorted.length} propiedad${sorted.length !== 1 ? 'es' : ''}`}
          </span>
        </div>

        {loading && (
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando propiedades...</span>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <Search size={48} strokeWidth={1.5} />
            </div>
            <h3>Sin resultados</h3>
            <p>
              {properties.length === 0
                ? 'Aún no hay propiedades disponibles.'
                : 'Ninguna propiedad coincide con los filtros.'}
            </p>
            {Object.values(filters).some(Boolean) && (
              <button className="btn btn-outline" style={{ marginTop: '1.5rem' }} onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <>
            <div className="catalog-grid">
              {paginatedProperties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {/* ← PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                  Anterior
                </button>

                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-page ${page === currentPage ? 'active' : ''}`}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* CTA */}
      <section className="home-cta">
        <div className="home-cta__inner">
          <h2>¿No encuentras lo que buscas?</h2>
          <p>Nuestro equipo te ayudará a encontrar la propiedad ideal.</p>
          <a href="mailto:info@inmobiliariapro.com" className="btn btn-gold btn-lg">
            Contactar a un asesor
          </a>
        </div>
      </section>
    </div>
  );
}

export default ClientHome;
