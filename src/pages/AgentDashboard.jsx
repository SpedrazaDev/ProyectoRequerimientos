// src/pages/AgentDashboard.jsx
// Dashboard del agente - Rediseñado
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  Home, Calendar, DollarSign, TrendingUp, 
  Clock, CheckCircle, MapPin, Bed, Bath, 
  Maximize, Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './AgentDashboard.css';

function AgentDashboard() {
  const [stats, setStats] = useState({
    properties: 0,
    bookings: 0,
    sales: 0,
    revenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Cargar citas
      const bookingsSnap = await getDocs(
        query(collection(db, 'bookings'), where('status', '==', 'pendiente'))
      );
      const bookingsData = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Cargar ventas del agente
      const salesSnap = await getDocs(
        query(collection(db, 'sales'), where('agentEmail', '==', user.email))
      );
      const salesData = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Calcular revenue
      const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.saleAmount || 0), 0);

      // Cargar propiedades
      const propertiesSnap = await getDocs(collection(db, 'properties'));
      const propertiesCount = propertiesSnap.size;

      setStats({
        properties: propertiesCount,
        bookings: bookingsData.length,
        sales: salesData.length,
        revenue: totalRevenue,
      });

      setRecentBookings(bookingsData.slice(0, 3));
      setRecentSales(salesData.slice(0, 3));

    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat('es-CR', {
      day: '2-digit',
      month: 'short',
    }).format(d);
  };

  if (loading) {
    return (
      <div className="agent-dashboard">
        <div className="loading-container">
          <div className="spinner" />
          <p>Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
      <div className="dashboard-container">

        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Mi Panel</h1>
            <p className="dashboard-subtitle">
              Resumen de tu actividad
            </p>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="stats-grid">
          
          <Link to="/agent/properties" className="stat-card stat-card--blue">
            <div className="stat-icon">
              <Home size={28} strokeWidth={2} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Propiedades</span>
              <span className="stat-value">{stats.properties}</span>
            </div>
          </Link>

          <Link to="/agent/bookings" className="stat-card stat-card--orange">
            <div className="stat-icon">
              <Clock size={28} strokeWidth={2} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Citas pendientes</span>
              <span className="stat-value">{stats.bookings}</span>
            </div>
          </Link>

          <Link to="/agent/calendar" className="stat-card stat-card--green">
            <div className="stat-icon">
              <Calendar size={28} strokeWidth={2} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Mi calendario</span>
              <span className="stat-value">Ver</span>
            </div>
          </Link>

          <Link to="/agent/sales" className="stat-card stat-card--gold">
            <div className="stat-icon">
              <DollarSign size={28} strokeWidth={2} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Ventas realizadas</span>
              <span className="stat-value">{stats.sales}</span>
            </div>
          </Link>

        </div>

        {/* Secciones de contenido */}
        <div className="dashboard-sections">

          {/* Citas recientes */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <Clock size={20} />
                Citas pendientes
              </h2>
              <Link to="/agent/bookings" className="btn btn-sm btn-outline">
                Ver todas
              </Link>
            </div>

            {recentBookings.length === 0 ? (
              <div className="empty-section">
                <CheckCircle size={48} strokeWidth={1.5} color="#ccc" />
                <p>Sin citas pendientes</p>
              </div>
            ) : (
              <div className="bookings-mini-list">
                {recentBookings.map(booking => (
                  <div key={booking.id} className="booking-mini-card">
                    <div className="booking-mini-header">
                      <div className="client-avatar-mini">
                        {booking.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="booking-mini-info">
                        <strong>{booking.name}</strong>
                        <small>{booking.propertyTitle}</small>
                      </div>
                    </div>
                    <div className="booking-mini-date">
                      {formatDate(booking.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ventas recientes */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <TrendingUp size={20} />
                Mis ventas
              </h2>
              <Link to="/agent/sales" className="btn btn-sm btn-outline">
                Registrar nueva
              </Link>
            </div>

            {recentSales.length === 0 ? (
              <div className="empty-section">
                <Package size={48} strokeWidth={1.5} color="#ccc" />
                <p>Sin ventas registradas</p>
              </div>
            ) : (
              <div className="sales-mini-list">
                {recentSales.map(sale => (
                  <div key={sale.id} className="sale-mini-card">
                    <div className="sale-mini-header">
                      <Home size={18} color="#c9a84c" />
                      <div className="sale-mini-info">
                        <strong>{sale.propertyTitle}</strong>
                        <small>
                          <MapPin size={12} />
                          {sale.propertyLocation}
                        </small>
                      </div>
                    </div>
                    <div className="sale-mini-price">
                      {formatPrice(sale.saleAmount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Acciones rápidas */}
        <div className="quick-actions">
          <h2>Acciones rápidas</h2>
          <div className="quick-actions-grid">
            
            <Link to="/agent/bookings?status=pendiente" className="quick-action-card">
              <div className="quick-action-icon quick-action-icon--orange">
                <Clock size={24} />
              </div>
              <div className="quick-action-content">
                <strong>Asignar citas</strong>
                <span>Programar visitas pendientes</span>
              </div>
            </Link>

            <Link to="/agent/sales" className="quick-action-card">
              <div className="quick-action-icon quick-action-icon--green">
                <DollarSign size={24} />
              </div>
              <div className="quick-action-content">
                <strong>Registrar venta</strong>
                <span>Marcar propiedad como vendida</span>
              </div>
            </Link>

            <Link to="/agent/calendar" className="quick-action-card">
              <div className="quick-action-icon quick-action-icon--blue">
                <Calendar size={24} />
              </div>
              <div className="quick-action-content">
                <strong>Ver calendario</strong>
                <span>Revisar citas programadas</span>
              </div>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}

export default AgentDashboard;
