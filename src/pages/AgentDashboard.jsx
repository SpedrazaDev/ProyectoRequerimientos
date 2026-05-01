// src/pages/AgentDashboard.jsx
// Dashboard para Agentes de Ventas: Ver citas y catálogo
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, where, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  Calendar, Clock, CheckCircle, X, Home, 
  RefreshCw, Phone, Mail, MessageSquare 
} from 'lucide-react';
import './AgentDashboard.css';

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
};

function AgentDashboard() {
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('bookings'); // 'bookings' o 'properties'
  const [updating, setUpdating] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar citas
      let bookingsData = [];
      try {
        const bookSnap = await getDocs(
          query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(50))
        );
        bookingsData = bookSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        const bookSnap = await getDocs(collection(db, 'bookings'));
        bookingsData = bookSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setBookings(bookingsData);

      // 2. Cargar propiedades (mismo catálogo que clientes)
      let propsData = [];
      try {
        const propSnap = await getDocs(
          query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(50))
        );
        propsData = propSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        const propSnap = await getDocs(collection(db, 'properties'));
        propsData = propSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setProperties(propsData);

    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (id, newStatus) => {
    setUpdating(id);
    try {
      await updateDoc(doc(db, 'bookings', id), { status: newStatus });
      setBookings(prev =>
        prev.map(b => b.id === id ? { ...b, status: newStatus } : b)
      );
    } catch (err) {
      console.error('Error actualizando estado:', err);
      alert('Error al actualizar. Intenta de nuevo.');
    } finally {
      setUpdating(null);
    }
  };

  const agentEmail = auth.currentUser?.email || 'Agente';
  const stats = {
    totalBookings: bookings.length,
    pending: bookings.filter(b => b.status === 'pendiente').length,
    confirmed: bookings.filter(b => b.status === 'confirmada').length,
    totalProperties: properties.length,
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-inline">
          <div className="spinner-sm" />
          <span>Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">

        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard de Agente</h1>
            <p className="dash-sub">Bienvenido, <strong>{agentEmail}</strong></p>
          </div>
          <button className="btn btn-dark" onClick={loadData}>
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card stat-card--gold">
            <div className="stat-card__icon"><Calendar size={28} /></div>
            <div className="stat-card__body">
              <span className="stat-card__label">Citas totales</span>
              <span className="stat-card__value">{stats.totalBookings}</span>
            </div>
          </div>

          <div className="stat-card stat-card--orange">
            <div className="stat-card__icon"><Clock size={28} /></div>
            <div className="stat-card__body">
              <span className="stat-card__label">Pendientes</span>
              <span className="stat-card__value">{stats.pending}</span>
            </div>
          </div>

          <div className="stat-card stat-card--green">
            <div className="stat-card__icon"><CheckCircle size={28} /></div>
            <div className="stat-card__body">
              <span className="stat-card__label">Confirmadas</span>
              <span className="stat-card__value">{stats.confirmed}</span>
            </div>
          </div>

          <div className="stat-card stat-card--blue">
            <div className="stat-card__icon"><Home size={28} /></div>
            <div className="stat-card__body">
              <span className="stat-card__label">Propiedades</span>
              <span className="stat-card__value">{stats.totalProperties}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="agent-tabs">
          <button
            className={`agent-tab ${activeView === 'bookings' ? 'agent-tab--active' : ''}`}
            onClick={() => setActiveView('bookings')}
          >
            <Calendar size={16} />
            Gestión de Citas
          </button>
          <button
            className={`agent-tab ${activeView === 'properties' ? 'agent-tab--active' : ''}`}
            onClick={() => setActiveView('properties')}
          >
            <Home size={16} />
            Catálogo de Propiedades
          </button>
        </div>

        {/* Vista de Citas */}
        {activeView === 'bookings' && (
          <div className="agent-section">
            <h2 className="section-title">Citas recientes</h2>
            
            {bookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Mail size={48} strokeWidth={1.5} /></div>
                <h3>Sin citas</h3>
                <p>Cuando los clientes soliciten visitas, aparecerán aquí.</p>
              </div>
            ) : (
              <div className="bookings-list">
                {bookings.map(booking => {
                  const StatusIcon = booking.status === 'confirmada' ? CheckCircle :
                                   booking.status === 'cancelada' ? X : Clock;
                  const statusClass = booking.status === 'confirmada' ? 'confirmed' :
                                    booking.status === 'cancelada' ? 'cancelled' : 'pending';
                  const isUpdating = updating === booking.id;

                  return (
                    <div key={booking.id} className={`booking-card booking-card--${statusClass}`}>
                      <div className="booking-card__header">
                        <div className="client-info">
                          <strong>{booking.name}</strong>
                          <small>{booking.email}</small>
                        </div>
                        <span className={`badge badge-${statusClass}`}>
                          <StatusIcon size={12} />
                          {booking.status === 'pendiente' && 'Pendiente'}
                          {booking.status === 'confirmada' && 'Confirmada'}
                          {booking.status === 'cancelada' && 'Cancelada'}
                        </span>
                      </div>

                      <div className="booking-card__info">
                        <div className="info-row">
                          <span className="info-label">Propiedad:</span>
                          <span>{booking.propertyTitle || '—'}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Fecha y hora:</span>
                          <span>{booking.date ? `${booking.date} · ${booking.time || '—'}` : '—'}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Teléfono:</span>
                          <a href={`tel:${booking.phone}`} className="phone-link">
                            <Phone size={12} />
                            {booking.phone}
                          </a>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Recibida:</span>
                          <span className="date-text">{formatDate(booking.createdAt)}</span>
                        </div>
                      </div>

                      {booking.message && (
                        <div className="booking-message">
                          <strong>Mensaje:</strong>
                          <p>"{booking.message}"</p>
                        </div>
                      )}

                      <div className="booking-card__actions">
                        <div className="action-group">
                          {booking.status !== 'confirmada' && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => changeStatus(booking.id, 'confirmada')}
                              disabled={isUpdating}
                            >
                              <CheckCircle size={14} />
                              {isUpdating ? '...' : 'Confirmar'}
                            </button>
                          )}
                          {booking.status !== 'pendiente' && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => changeStatus(booking.id, 'pendiente')}
                              disabled={isUpdating}
                            >
                              <Clock size={14} />
                              Pendiente
                            </button>
                          )}
                          {booking.status !== 'cancelada' && (
                            <button
                              className="btn btn-sm"
                              style={{ background: 'rgba(231,76,60,.08)', color: 'var(--danger)', border: '1px solid rgba(231,76,60,.25)' }}
                              onClick={() => changeStatus(booking.id, 'cancelada')}
                              disabled={isUpdating}
                            >
                              <X size={14} />
                              Cancelar
                            </button>
                          )}
                        </div>

                        <div className="action-group">
                          <a href={`mailto:${booking.email}`} className="btn btn-sm btn-dark">
                            <Mail size={14} />
                            Email
                          </a>
                          <a
                            href={`https://wa.me/${booking.phone?.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm"
                            style={{ background: '#25D366', color: 'white' }}
                          >
                            <MessageSquare size={14} />
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Vista de Propiedades */}
        {activeView === 'properties' && (
          <div className="agent-section">
            <h2 className="section-title">Catálogo de Propiedades</h2>
            
            {properties.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Home size={48} strokeWidth={1.5} /></div>
                <h3>Sin propiedades</h3>
                <p>El catálogo de propiedades aparecerá aquí.</p>
              </div>
            ) : (
              <div className="properties-grid">
                {properties.map(prop => {
                  const firstImage = Array.isArray(prop.images) ? prop.images[0] : (prop.imageUrl || '');
                  const formatPrice = (p) =>
                    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p);

                  return (
                    <div key={prop.id} className="property-card-simple">
                      {firstImage && (
                        <div className="property-card-simple__image">
                          <img src={firstImage} alt={prop.title} loading="lazy" />
                          <span className="property-type-badge">{prop.type}</span>
                        </div>
                      )}
                      <div className="property-card-simple__body">
                        <p className="property-price">{formatPrice(prop.price)}</p>
                        <h3 className="property-title">{prop.title}</h3>
                        <p className="property-location">📍 {prop.location}</p>
                        <div className="property-features">
                          {prop.bedrooms > 0 && <span>🛏 {prop.bedrooms}</span>}
                          {prop.bathrooms > 0 && <span>🚿 {prop.bathrooms}</span>}
                          <span>📐 {prop.area} m²</span>
                        </div>
                        <Link to={`/property/${prop.id}`} className="property-link" target="_blank">
                          Ver detalles →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default AgentDashboard;
