// src/pages/Reports.jsx
// Dashboard de reportes con gráficos
import React, { useState, useEffect } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
  TrendingUp, Users, Calendar, DollarSign,
  CheckCircle, Clock, XCircle, Award, Trophy, Star
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Reports.css';

const COLORS = {
  pendiente: '#f39c12',
  confirmada: '#27ae60',
  cancelada: '#e74c3c',
};

function Reports() {
  const [bookings, setBookings] = useState([]);
  const [sales, setSales] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // ← NUEVO: Filtros por fecha
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    period: 'all' // all, today, week, month, custom
  });

  useEffect(() => {
    // ← NUEVO: Suscripción en tiempo real a cambios en properties
    const unsubscribeProperties = onSnapshot(
      collection(db, 'properties'),
      () => {
        loadData(); // Recargar datos cuando cambie alguna propiedad
      },
      (error) => {
        console.error('Error en suscripción a properties:', error);
      }
    );

    // ← NUEVO: Suscripción en tiempo real a cambios en sales
    const unsubscribeSales = onSnapshot(
      collection(db, 'sales'),
      () => {
        loadData(); // Recargar datos cuando cambie alguna venta
      },
      (error) => {
        console.error('Error en suscripción a sales:', error);
      }
    );

    // ← NUEVO: Suscripción en tiempo real a cambios en bookings
    const unsubscribeBookings = onSnapshot(
      collection(db, 'bookings'),
      () => {
        loadData(); // Recargar datos cuando cambie alguna cita
      },
      (error) => {
        console.error('Error en suscripción a bookings:', error);
      }
    );

    // Cleanup: cancelar suscripciones al desmontar
    return () => {
      unsubscribeProperties();
      unsubscribeSales();
      unsubscribeBookings();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar citas
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      const bookingsData = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookings(bookingsData);

      // Cargar ventas
      const salesSnap = await getDocs(collection(db, 'sales'));
      let salesData = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // ← NUEVO: Validar que las propiedades sigan vendidas
      const propertiesSnap = await getDocs(collection(db, 'properties'));
      const propertiesMap = new Map(
        propertiesSnap.docs.map(d => [d.id, d.data()])
      );

      // Filtrar ventas: solo mostrar si la propiedad sigue vendida
      salesData = salesData.filter(sale => {
        const property = propertiesMap.get(sale.propertyId);
        return property && property.status === 'vendida';
      });

      setSales(salesData);

      // Cargar agentes
      const agentsSnap = await getDocs(collection(db, 'employees'));
      const agentsData = agentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAgents(agentsData);

    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  // ← NUEVO: Función para filtrar por fechas
  const filterByDate = (items, dateField = 'createdAt') => {
    if (dateFilter.period === 'all') return items;

    const now = new Date();
    let startDate, endDate;

    switch (dateFilter.period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'custom':
        if (!dateFilter.startDate || !dateFilter.endDate) return items;
        startDate = new Date(dateFilter.startDate);
        endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59);
        break;
      default:
        return items;
    }

    return items.filter(item => {
      const itemDate = item[dateField]?.toDate ? item[dateField].toDate() : new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  // KPIs con filtros de fecha
  const filteredBookings = filterByDate(bookings);
  const filteredSales = filterByDate(sales);

  const kpis = {
    totalBookings: filteredBookings.length,
    confirmed: filteredBookings.filter(b => b.status === 'confirmada').length,
    cancelled: filteredBookings.filter(b => b.status === 'cancelada').length,
    totalSales: filteredSales.length,
    totalRevenue: filteredSales.reduce((sum, s) => sum + (s.saleAmount || 0), 0),
    conversionRate: filteredBookings.length > 0
      ? ((filteredSales.length / filteredBookings.length) * 100).toFixed(1)
      : 0,
  };

  // Datos para gráfico de pie: Citas por estado (filtrado)
  const bookingsByStatus = [
    { name: 'Pendientes', value: filteredBookings.filter(b => b.status === 'pendiente').length, color: COLORS.pendiente },
    { name: 'Confirmadas', value: filteredBookings.filter(b => b.status === 'confirmada').length, color: COLORS.confirmada },
    { name: 'Canceladas', value: filteredBookings.filter(b => b.status === 'cancelada').length, color: COLORS.cancelada },
  ].filter(item => item.value > 0);

  // Datos para gráfico de barras: Ventas por agente (filtrado)
  const salesByAgent = agents.map(agent => ({
    name: agent.name,
    ventas: filteredSales.filter(s => s.agentEmail === agent.email).length,
    ingresos: filteredSales
      .filter(s => s.agentEmail === agent.email)
      .reduce((sum, s) => sum + (s.saleAmount || 0), 0),
  })).filter(item => item.ventas > 0);

  // Datos para tabla de estadísticas por agente (filtrado)
  const agentStats = agents.map(agent => {
    const agentBookings = filteredBookings.filter(b => 
      b.assignedTo === agent.email || b.email === agent.email
    );
    const agentSales = filteredSales.filter(s => s.agentEmail === agent.email);
    
    return {
      name: agent.name,
      email: agent.email,
      citas: agentBookings.length,
      confirmadas: agentBookings.filter(b => b.status === 'confirmada').length,
      canceladas: agentBookings.filter(b => b.status === 'cancelada').length,
      ventas: agentSales.length,
      conversionRate: agentBookings.length > 0 
        ? ((agentSales.length / agentBookings.length) * 100).toFixed(1)
        : 0,
    };
  }).filter(agent => agent.citas > 0 || agent.ventas > 0);

  // HU-037-040: Métricas adicionales
  const recordSale = filteredSales.length > 0
    ? Math.max(...filteredSales.map(s => s.saleAmount || 0))
    : 0;

  const topAgent = agentStats.length > 0
    ? agentStats.reduce((best, a) => Number(a.ventas) > Number(best.ventas) ? a : best, agentStats[0])
    : null;

  const avgDaysToSale = (() => {
    const diffs = filteredSales.map(sale => {
      const booking = filteredBookings.find(b =>
        b.propertyId === sale.propertyId && b.status === 'confirmada'
      );
      if (!booking) return null;
      const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
      const saleDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
      const diff = (saleDate - bookingDate) / (1000 * 60 * 60 * 24);
      return diff >= 0 ? diff : null;
    }).filter(d => d !== null);
    if (diffs.length === 0) return null;
    return (diffs.reduce((sum, d) => sum + d, 0) / diffs.length).toFixed(1);
  })();

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);

  if (loading) {
    return (
      <div className="reports-page">
        <div className="loading-container">
          <div className="spinner" />
          <p>Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="reports-container">

        {/* Header */}
        <div className="reports-header">
          <div>
            <h1 className="dash-title">Reportes y Estadísticas</h1>
            <p className="dash-sub">
              Análisis del desempeño de la agencia • Actualización automática
            </p>
          </div>
        </div>

        {/* ← NUEVO: Filtros por fecha */}
        <div className="date-filters">
          <select
            value={dateFilter.period}
            onChange={(e) => setDateFilter(prev => ({ ...prev, period: e.target.value }))}
            className="date-filter-select"
          >
            <option value="all">Todo el tiempo</option>
            <option value="today">Hoy</option>
            <option value="week">Últimos 7 días</option>
            <option value="month">Este mes</option>
            <option value="custom">Rango personalizado</option>
          </select>

          {dateFilter.period === 'custom' && (
            <>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="date-filter-input"
              />
              <span style={{ color: '#666' }}>hasta</span>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="date-filter-input"
              />
            </>
          )}
        </div>

        {/* KPIs */}
        <div className="kpis-grid">
          
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-icon">
              <Calendar size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Total citas</span>
              <span className="kpi-value">{kpis.totalBookings}</span>
            </div>
          </div>

          <div className="kpi-card kpi-card--green">
            <div className="kpi-icon">
              <CheckCircle size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Confirmadas</span>
              <span className="kpi-value">{kpis.confirmed}</span>
            </div>
          </div>

          <div className="kpi-card kpi-card--red">
            <div className="kpi-icon">
              <XCircle size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Canceladas</span>
              <span className="kpi-value">{kpis.cancelled}</span>
            </div>
          </div>

          <div className="kpi-card kpi-card--gold">
            <div className="kpi-icon">
              <DollarSign size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Ventas totales</span>
              <span className="kpi-value">{kpis.totalSales}</span>
            </div>
          </div>

          <div className="kpi-card kpi-card--purple">
            <div className="kpi-icon">
              <TrendingUp size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Ingresos</span>
              <span className="kpi-value">{formatPrice(kpis.totalRevenue)}</span>
            </div>
          </div>

          <div className="kpi-card kpi-card--orange">
            <div className="kpi-icon">
              <Award size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Conversión</span>
              <span className="kpi-value">{kpis.conversionRate}%</span>
            </div>
          </div>

          <div className="kpi-card kpi-card--gold">
            <div className="kpi-icon">
              <Trophy size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Récord de venta</span>
              <span className="kpi-value">{formatPrice(recordSale)}</span>
            </div>
          </div>

          <div className="kpi-card kpi-card--purple">
            <div className="kpi-icon">
              <Star size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Agente top</span>
              <span className="kpi-value" style={{ fontSize: '1rem' }}>
                {topAgent ? `${topAgent.name} (${topAgent.ventas})` : '—'}
              </span>
            </div>
          </div>

          <div className="kpi-card kpi-card--blue">
            <div className="kpi-icon">
              <Clock size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Tiempo promedio cita→venta</span>
              <span className="kpi-value">
                {avgDaysToSale !== null ? `${avgDaysToSale} días` : '—'}
              </span>
            </div>
          </div>

        </div>

        {/* Gráficos */}
        <div className="charts-grid">

          {/* Gráfico de pie: Citas por estado */}
          <div className="chart-card">
            <h3 className="chart-title">
              <Calendar size={20} />
              Citas por estado
            </h3>
            {bookingsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bookingsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => 
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bookingsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <p>Sin datos de citas</p>
              </div>
            )}
          </div>

          {/* Gráfico de barras: Ventas por agente */}
          <div className="chart-card">
            <h3 className="chart-title">
              <Users size={20} />
              Ventas por agente
            </h3>
            {salesByAgent.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByAgent}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ventas" fill="#c9a84c" name="Ventas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <p>Sin datos de ventas</p>
              </div>
            )}
          </div>

        </div>

        {/* Tabla de estadísticas por agente */}
        <div className="stats-table-card">
          <h3 className="chart-title">
            <Users size={20} />
            Estadísticas por agente
          </h3>

          {agentStats.length > 0 ? (
            <div className="table-wrapper">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Agente</th>
                    <th>Total citas</th>
                    <th>Confirmadas</th>
                    <th>Canceladas</th>
                    <th>Ventas</th>
                    <th>Conversión</th>
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map((agent, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="agent-cell">
                          <div className="agent-avatar">
                            {agent.name.charAt(0)}
                          </div>
                          <div>
                            <strong>{agent.name}</strong>
                            <small>{agent.email}</small>
                          </div>
                        </div>
                      </td>
                      <td className="number-cell">{agent.citas}</td>
                      <td className="number-cell success">{agent.confirmadas}</td>
                      <td className="number-cell danger">{agent.canceladas}</td>
                      <td className="number-cell gold">{agent.ventas}</td>
                      <td className="number-cell">
                        <span className={`conversion-badge ${
                          agent.conversionRate >= 50 ? 'high' :
                          agent.conversionRate >= 25 ? 'medium' : 'low'
                        }`}>
                          {agent.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="chart-empty">
              <p>Sin datos de agentes</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Reports;
