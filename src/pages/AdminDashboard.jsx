// src/pages/AdminDashboard.jsx
// ─────────────────────────────────────────────────────────────────────
//  Panel principal del administrador - OPTIMIZADO
//  • Estadísticas: total propiedades, citas pendientes/confirmadas
//  • Tabla de citas recientes (SOLO 8, no todas)
//  • Accesos rápidos a las secciones de gestión
//  • Iconos SVG profesionales
// ─────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Home, Calendar, Clock, CheckCircle, Plus, ClipboardList, Globe, Mail } from 'lucide-react';
import './AdminDashboard.css';

// Formato de fecha legible
const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
};

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    totalBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Cargar estadísticas OPTIMIZADO ──
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Contar propiedades (sin traer datos, solo count)
        const propSnap = await getDocs(collection(db, 'properties'));
        const totalProperties = propSnap.size;

        // 2. Contar todas las citas (sin traer datos)
        const bookSnap = await getDocs(collection(db, 'bookings'));
        const totalBookings = bookSnap.size;

        // 3. Contar citas pendientes (sin traer datos)
        const pendingSnap = await getDocs(
          query(collection(db, 'bookings'), where('status', '==', 'pendiente'))
        );
        const pendingBookings = pendingSnap.size;

        // 4. Contar citas confirmadas (sin traer datos)
        const confirmedSnap = await getDocs(
          query(collection(db, 'bookings'), where('status', '==', 'confirmada'))
        );
        const confirmedBookings = confirmedSnap.size;

        setStats({ totalProperties, totalBookings, pendingBookings, confirmedBookings });

        // 5. ⚡ SOLO las 8 más recientes (RÁPIDO) ⚡
        let recentData = [];
        try {
          const recentSnap = await getDocs(
            query(
              collection(db, 'bookings'),
              orderBy('createdAt', 'desc'),
              limit(8)  // ← Solo 8, no todas
            )
          );
          recentData = recentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
          // Si no hay índice, tomar primeras 8 sin ordenar
          recentData = bookSnap.docs
            .slice(0, 8)
            .map(d => ({ id: d.id, ...d.data() }));
        }
        setRecentBookings(recentData);

      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const adminEmail = auth.currentUser?.email || 'Administrador';

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

        {/* ── Header ── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-sub">Bienvenido, <strong>{adminEmail}</strong></p>
          </div>
          <div className="dash-header-actions">
            <Link to="/admin/properties" className="btn btn-gold">
              <Plus size={16} />
              Nueva propiedad
            </Link>
          </div>
        </div>

        {/* ── Tarjetas de estadísticas ── */}
        <div className="stats-grid">
          <div className="stat-card stat-card--blue">
            <div className="stat-card__icon">
              <Home size={28} />
            </div>
            <div className="stat-card__body">
              <span className="stat-card__label">Propiedades</span>
              <span className="stat-card__value">{stats.totalProperties}</span>
            </div>
            <Link to="/admin/properties" className="stat-card__link">Gestionar →</Link>
          </div>

          <div className="stat-card stat-card--gold">
            <div className="stat-card__icon">
              <Calendar size={28} />
            </div>
            <div className="stat-card__body">
              <span className="stat-card__label">Citas totales</span>
              <span className="stat-card__value">{stats.totalBookings}</span>
            </div>
            <Link to="/admin/bookings" className="stat-card__link">Ver todas →</Link>
          </div>

          <div className="stat-card stat-card--orange">
            <div className="stat-card__icon">
              <Clock size={28} />
            </div>
            <div className="stat-card__body">
              <span className="stat-card__label">Pendientes</span>
              <span className="stat-card__value">{stats.pendingBookings}</span>
            </div>
            <Link to="/admin/bookings?status=pendiente" className="stat-card__link">Atender →</Link>
          </div>

          <div className="stat-card stat-card--green">
            <div className="stat-card__icon">
              <CheckCircle size={28} />
            </div>
            <div className="stat-card__body">
              <span className="stat-card__label">Confirmadas</span>
              <span className="stat-card__value">{stats.confirmedBookings}</span>
            </div>
            <Link to="/admin/bookings?status=confirmada" className="stat-card__link">Ver →</Link>
          </div>
        </div>

        {/* ── Accesos rápidos ── */}
        <div className="quick-access">
          <h2 className="section-title">Accesos rápidos</h2>
          <div className="quick-grid">
            <Link to="/admin/properties" className="quick-card">
              <span className="quick-icon"><Home size={22} /></span>
              <span className="quick-label">Agregar propiedad</span>
              <span className="quick-arrow">→</span>
            </Link>
            <Link to="/admin/bookings" className="quick-card">
              <span className="quick-icon"><ClipboardList size={22} /></span>
              <span className="quick-label">Ver todas las citas</span>
              <span className="quick-arrow">→</span>
            </Link>
            <Link to="/" className="quick-card" target="_blank" rel="noopener noreferrer">
              <span className="quick-icon"><Globe size={22} /></span>
              <span className="quick-label">Ver sitio público</span>
              <span className="quick-arrow">↗</span>
            </Link>
          </div>
        </div>

        {/* ── Citas recientes ── */}
        <div className="recent-section">
          <div className="recent-header">
            <h2 className="section-title">Citas recientes</h2>
            <Link to="/admin/bookings" className="see-all-link">Ver todas</Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Mail size={48} strokeWidth={1.5} />
              </div>
              <h3>Sin citas aún</h3>
              <p>Las citas de clientes aparecerán aquí.</p>
            </div>
          ) : (
            <div className="bookings-table-wrap">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Propiedad</th>
                    <th>Fecha visita</th>
                    <th>Recibida</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div className="client-cell">
                          <strong>{b.name}</strong>
                          <small>{b.email}</small>
                        </div>
                      </td>
                      <td className="property-cell">{b.propertyTitle}</td>
                      <td className="date-cell">
                        {b.date ? `${b.date} · ${b.time || '—'}` : '—'}
                      </td>
                      <td className="date-cell">{formatDate(b.createdAt)}</td>
                      <td>
                        <span className={`badge badge-${
                          b.status === 'confirmada' ? 'confirmed' :
                          b.status === 'cancelada'  ? 'cancelled' : 'pending'
                        }`}>
                          {b.status === 'pendiente'  && <><Clock size={12} /> Pendiente</>}
                          {b.status === 'confirmada' && <><CheckCircle size={12} /> Confirmada</>}
                          {b.status === 'cancelada'  && <>Cancelada</>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;
