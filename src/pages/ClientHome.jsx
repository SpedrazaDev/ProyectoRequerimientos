// src/pages/ClientHome.jsx
// ─────────────────────────────────────────────────────────────────────
//  Página principal pública: catálogo de propiedades con filtros.
//  Carga todas las propiedades de Firestore y permite filtrarlas
//  por tipo, precio y número de habitaciones.
// ─────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import PropertyCard from '../components/PropertyCard';
import './ClientHome.css';

// Valores iniciales del filtro
const EMPTY_FILTERS = {
  type:     '',
  minPrice: '',
  maxPrice: '',
  bedrooms: '',
  search:   '',
};

function ClientHome() {
  const [properties, setProperties]   = useState([]);   // todas las propiedades
  const [loading,    setLoading]       = useState(true); // cargando de Firebase
  const [error,      setError]         = useState('');   // mensaje de error
  const [filters,    setFilters]       = useState(EMPTY_FILTERS);

  // ── Cargar propiedades desde Firestore ──
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProperties(data);
      } catch (err) {
        // Si no hay índice de "createdAt", carga sin orden
        try {
          const snapshot = await getDocs(collection(db, 'properties'));
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProperties(data);
        } catch (err2) {
          setError('No se pudieron cargar las propiedades. Verifica la conexión con Firebase.');
          console.error(err2);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  // ── Filtrar propiedades en memoria (sin ir a Firebase) ──
  // useMemo: solo recalcula cuando cambian `properties` o `filters`
  const filtered = useMemo(() => {
    return properties.filter(p => {
      // Filtro de texto libre (busca en título, ubicación y descripción)
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matches =
          p.title?.toLowerCase().includes(term) ||
          p.location?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      // Tipo de propiedad
      if (filters.type && p.type !== filters.type) return false;

      // Precio mínimo
      if (filters.minPrice && p.price < Number(filters.minPrice)) return false;

      // Precio máximo
      if (filters.maxPrice && p.price > Number(filters.maxPrice)) return false;

      // Habitaciones
      if (filters.bedrooms && p.bedrooms !== Number(filters.bedrooms)) return false;

      return true;
    });
  }, [properties, filters]);

  // Manejar cambios en cualquier filtro
  const handleFilter = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Resetear todos los filtros
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  // ── Renderizado ──
  return (
    <div className="client-home">

      {/* ────── HERO ────── */}
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

          {/* Barra de búsqueda principal */}
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
              🔍 Buscar
            </button>
          </div>
        </div>
      </section>

      {/* ────── FILTROS ────── */}
      <section className="filters-bar">
        <div className="filters-bar__inner">
          <span className="filters-bar__label">Filtrar:</span>

          {/* Tipo */}
          <select name="type" value={filters.type} onChange={handleFilter} className="filter-select">
            <option value="">Todos los tipos</option>
            <option value="Casa">🏠 Casa</option>
            <option value="Apartamento">🏢 Apartamento</option>
            <option value="Terreno">🌿 Terreno</option>
            <option value="Comercial">🏪 Comercial</option>
          </select>

          {/* Habitaciones */}
          <select name="bedrooms" value={filters.bedrooms} onChange={handleFilter} className="filter-select">
            <option value="">Habitaciones</option>
            <option value="1">1 hab.</option>
            <option value="2">2 hab.</option>
            <option value="3">3 hab.</option>
            <option value="4">4 hab.</option>
            <option value="5">5+ hab.</option>
          </select>

          {/* Precio mín */}
          <input
            type="number"
            name="minPrice"
            placeholder="Precio mín. ($)"
            value={filters.minPrice}
            onChange={handleFilter}
            className="filter-input"
            min="0"
          />

          {/* Precio máx */}
          <input
            type="number"
            name="maxPrice"
            placeholder="Precio máx. ($)"
            value={filters.maxPrice}
            onChange={handleFilter}
            className="filter-input"
            min="0"
          />

          {/* Limpiar filtros */}
          {Object.values(filters).some(Boolean) && (
            <button className="filter-clear" onClick={clearFilters}>
              ✕ Limpiar
            </button>
          )}
        </div>
      </section>

      {/* ────── CATÁLOGO ────── */}
      <section className="catalog-section">
        <div className="catalog-section__header">
          <h2 className="catalog-section__title">
            {filters.search ? `Resultados para "${filters.search}"` : 'Propiedades disponibles'}
          </h2>
          <span className="catalog-section__count">
            {loading ? '...' : `${filtered.length} propiedad${filtered.length !== 1 ? 'es' : ''}`}
          </span>
        </div>

        {/* Estado: cargando */}
        {loading && (
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando propiedades...</span>
          </div>
        )}

        {/* Estado: error */}
        {!loading && error && (
          <div className="alert alert-error">{error}</div>
        )}

        {/* Estado: sin resultados */}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Sin resultados</h3>
            <p>
              {properties.length === 0
                ? 'Aún no hay propiedades en el catálogo.'
                : 'Ninguna propiedad coincide con los filtros seleccionados.'}
            </p>
            {Object.values(filters).some(Boolean) && (
              <button className="btn btn-outline" style={{ marginTop: '1.5rem' }} onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Grid de propiedades */}
        {!loading && !error && filtered.length > 0 && (
          <div className="catalog-grid">
            {filtered.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>

      {/* ────── FOOTER / CTA ────── */}
      <section className="home-cta">
        <div className="home-cta__inner">
          <h2>¿No encuentras lo que buscas?</h2>
          <p>Nuestro equipo de expertos te ayudará a encontrar la propiedad ideal.</p>
          <a href="mailto:info@inmobiliariapro.com" className="btn btn-gold btn-lg">
            Contactar a un asesor
          </a>
        </div>
      </section>
    </div>
  );
}

export default ClientHome;
