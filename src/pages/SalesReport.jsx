// src/pages/SalesReport.jsx
// Vista de ventas para ADMIN (solo lectura)
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { DollarSign, TrendingUp, CheckCircle, User, Mail, Phone } from 'lucide-react';
import './SalesManagement.css';

function SalesReport() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const salesSnap = await getDocs(collection(db, 'sales'));
      const salesData = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      salesData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setSales(salesData);
    } catch (err) {
      console.error('Error cargando ventas:', err);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  };

  const stats = {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, s) => sum + (s.saleAmount || 0), 0),
    avgSale: sales.length > 0
      ? sales.reduce((sum, s) => sum + (s.saleAmount || 0), 0) / sales.length
      : 0,
  };

  return (
    <div className="admin-page">
      <div className="admin-container">

        <div className="pm-header">
          <div>
            <h1 className="dash-title">Reporte de Ventas</h1>
            <p className="dash-sub">
              {sales.length} venta{sales.length !== 1 ? 's' : ''} registrada{sales.length !== 1 ? 's' : ''} por los agentes
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card stat-card--success">
            <div className="stat-card__icon">
              <CheckCircle size={28} strokeWidth={2} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Ventas totales</span>
              <span className="stat-card__value">{stats.totalSales}</span>
            </div>
          </div>

          <div className="stat-card stat-card--gold">
            <div className="stat-card__icon">
              <DollarSign size={28} strokeWidth={2} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Ingresos totales</span>
              <span className="stat-card__value">
                {formatPrice(stats.totalRevenue)}
              </span>
            </div>
          </div>

          <div className="stat-card stat-card--info">
            <div className="stat-card__icon">
              <TrendingUp size={28} strokeWidth={2} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Promedio por venta</span>
              <span className="stat-card__value">
                {formatPrice(stats.avgSale)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de ventas */}
        {loading ? (
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando ventas...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <DollarSign size={48} strokeWidth={1.5} />
            </div>
            <h3>Sin ventas registradas</h3>
            <p>Los agentes aún no han registrado ventas.</p>
          </div>
        ) : (
          <div className="pm-table-wrap">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Propiedad</th>
                  <th>Comprador</th>
                  <th>Contacto</th>
                  <th>Monto</th>
                  <th>Método de pago</th>
                  <th>Fecha de cierre</th>
                  <th>Agente</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td>
                      <div className="table-title-cell">
                        <strong>{sale.propertyTitle}</strong>
                        <small>📍 {sale.propertyLocation}</small>
                      </div>
                    </td>
                    <td>
                      <div className="table-client">
                        <User size={16} />
                        <strong>{sale.clientName}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="table-contact">
                        <a href={`mailto:${sale.clientEmail}`}>
                          <Mail size={14} />
                          {sale.clientEmail}
                        </a>
                        <a href={`tel:${sale.clientPhone}`}>
                          <Phone size={14} />
                          {sale.clientPhone}
                        </a>
                      </div>
                    </td>
                    <td className="price-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                        <strong style={{ color: '#c9a84c' }}>
                          {formatPrice(sale.saleAmount)}
                        </strong>
                        {sale.originalPrice && sale.originalPrice !== sale.saleAmount && (
                          <small style={{ color: '#999' }}>
                            Precio original: {formatPrice(sale.originalPrice)}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="type-chip">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="date-cell">
                      {formatDate(sale.closingDate)}
                    </td>
                    <td>
                      <span className="type-chip">
                        {sale.agentName || 'No asignado'}
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
  );
}

export default SalesReport;
