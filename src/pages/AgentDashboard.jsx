// src/pages/AgentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home, Calendar, DollarSign, TrendingUp,
  Clock, CheckCircle, MapPin,
  Package, Users, Target, ArrowRight, ChevronRight
} from 'lucide-react';
import './AgentDashboard.css';

const STAGES = [
  { key: 'interested',   label: 'Interesado',  color: '#1565c0', bg: '#e3f2fd' },
  { key: 'negotiation',  label: 'Negociación',  color: '#856404', bg: '#fff3cd' },
  { key: 'closed',       label: 'Cerrado',      color: '#2e7d32', bg: '#e8f5e9' },
];

function AgentDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    properties: 0,
    bookings: 0,
    sales: 0,
    revenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [leads, setLeads] = useState([]);
  const [updatingLead, setUpdatingLead] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const [bookingsSnap, salesSnap, propertiesSnap, leadsSnap] = await Promise.all([
        getDocs(query(collection(db, 'bookings'), where('status', '==', 'pendiente'))),
        getDocs(query(collection(db, 'sales'), where('agentEmail', '==', user.email))),
        getDocs(collection(db, 'properties')),
        getDocs(query(collection(db, 'leads'), where('agentEmail', '==', user.email))),
      ]);

      const bookingsData    = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const salesData       = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const leadsData       = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const totalRevenue    = salesData.reduce((s, v) => s + (Number(v.saleAmount) || 0), 0);

      setStats({
        properties: propertiesSnap.size,
        bookings:   bookingsData.length,
        sales:      salesData.length,
        revenue:    totalRevenue,
      });
      setRecentBookings(bookingsData.slice(0, 3));
      setRecentSales(salesData.slice(0, 3));
      setLeads(leadsData);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (p) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p || 0);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short' }).format(d);
  };

  const advanceStage = async (lead) => {
    if (lead.stage !== 'interested') return;
    setUpdatingLead(lead.id);
    try {
      await updateDoc(doc(db, 'leads', lead.id), { stage: 'negotiation', updatedAt: new Date() });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: 'negotiation' } : l));
    } catch (err) {
      console.error('Error actualizando etapa:', err);
    } finally {
      setUpdatingLead(null);
    }
  };

  const registerSaleFromLead = (lead) => {
    navigate('/agent/sales', {
      state: {
        fromLead: {
          leadId:         lead.id,
          propertyId:     lead.propertyId,
          propertyTitle:  lead.propertyTitle,
          clientName:     lead.clientName,
          clientEmail:    lead.clientEmail,
          estimatedValue: lead.estimatedValue,
        },
      },
    });
  };

  const leadsByStage = (stageKey) =>
    leads.filter(l => l.stage === stageKey);

  const activeLeadsCount = leads.filter(l => l.stage === 'interested' || l.stage === 'negotiation').length;

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
            <p className="dashboard-subtitle">Resumen de tu actividad</p>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="stats-grid">
          <Link to="/agent/bookings" className="stat-card stat-card--orange">
            <div className="stat-icon"><Clock size={28} strokeWidth={2} /></div>
            <div className="stat-content">
              <span className="stat-label">Citas pendientes</span>
              <span className="stat-value">{stats.bookings}</span>
            </div>
          </Link>

          <Link to="/agent/sales" className="stat-card stat-card--gold">
            <div className="stat-icon"><DollarSign size={28} strokeWidth={2} /></div>
            <div className="stat-content">
              <span className="stat-label">Ventas realizadas</span>
              <span className="stat-value">{stats.sales}</span>
            </div>
          </Link>

          <div className="stat-card stat-card--blue">
            <div className="stat-icon"><Users size={28} strokeWidth={2} /></div>
            <div className="stat-content">
              <span className="stat-label">Leads activos</span>
              <span className="stat-value">{activeLeadsCount}</span>
            </div>
          </div>

          <Link to="/agent/calendar" className="stat-card stat-card--green">
            <div className="stat-icon"><Calendar size={28} strokeWidth={2} /></div>
            <div className="stat-content">
              <span className="stat-label">Mi calendario</span>
              <span className="stat-value">Ver</span>
            </div>
          </Link>
        </div>

        {/* Secciones: citas y ventas */}
        <div className="dashboard-sections">
          <div className="dashboard-section">
            <div className="section-header">
              <h2><Clock size={20} />Citas pendientes</h2>
              <Link to="/agent/bookings" className="btn btn-sm btn-outline">Ver todas</Link>
            </div>
            {recentBookings.length === 0 ? (
              <div className="empty-section">
                <CheckCircle size={48} strokeWidth={1.5} color="#ccc" />
                <p>Sin citas pendientes</p>
              </div>
            ) : (
              <div className="bookings-mini-list">
                {recentBookings.map(b => (
                  <div key={b.id} className="booking-mini-card">
                    <div className="booking-mini-header">
                      <div className="client-avatar-mini">
                        {b.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="booking-mini-info">
                        <strong>{b.name}</strong>
                        <small>{b.propertyTitle}</small>
                      </div>
                    </div>
                    <div className="booking-mini-date">{formatDate(b.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-section">
            <div className="section-header">
              <h2><TrendingUp size={20} />Mis ventas</h2>
              <Link to="/agent/sales" className="btn btn-sm btn-outline">Registrar nueva</Link>
            </div>
            {recentSales.length === 0 ? (
              <div className="empty-section">
                <Package size={48} strokeWidth={1.5} color="#ccc" />
                <p>Sin ventas registradas</p>
              </div>
            ) : (
              <div className="sales-mini-list">
                {recentSales.map(s => (
                  <div key={s.id} className="sale-mini-card">
                    <div className="sale-mini-header">
                      <Home size={18} color="#c9a84c" />
                      <div className="sale-mini-info">
                        <strong>{s.propertyTitle}</strong>
                        <small><MapPin size={12} />{s.propertyLocation}</small>
                      </div>
                    </div>
                    <div className="sale-mini-price">{formatPrice(s.saleAmount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Mi Pipeline CRM ── */}
        <div className="pipeline-section">
          <div className="pipeline-header">
            <div className="pipeline-header-left">
              <Target size={22} />
              <h2>Mi Pipeline CRM</h2>
              <span className="pipeline-badge">{activeLeadsCount} activos</span>
            </div>
            <Link to="/agent/crm" className="pipeline-crm-link">
              CRM completo <ChevronRight size={16} />
            </Link>
          </div>

          {leads.length === 0 ? (
            <div className="pipeline-empty">
              <Users size={40} strokeWidth={1.5} />
              <p>No tienes leads asignados aún.</p>
              <Link to="/agent/crm" className="btn btn-sm btn-outline">Ir al CRM</Link>
            </div>
          ) : (
            <div className="pipeline-columns">
              {STAGES.map(stage => {
                const stageLeads = leadsByStage(stage.key);
                return (
                  <div key={stage.key} className="pipeline-col">
                    <div className="pipeline-col-header" style={{ borderColor: stage.color }}>
                      <span className="pipeline-col-title" style={{ color: stage.color }}>
                        {stage.label}
                      </span>
                      <span className="pipeline-col-count" style={{ background: stage.bg, color: stage.color }}>
                        {stageLeads.length}
                      </span>
                    </div>

                    {stageLeads.length === 0 ? (
                      <div className="pipeline-col-empty">Sin leads</div>
                    ) : (
                      <div className="pipeline-cards">
                        {stageLeads.slice(0, 4).map(lead => (
                          <div key={lead.id} className="pipeline-card">
                            <div className="pipeline-card-top">
                              <div>
                                <div className="pipeline-client-name">{lead.clientName}</div>
                                <div className="pipeline-client-email">{lead.clientEmail || '—'}</div>
                              </div>
                              {lead.probability !== undefined && (
                                <div
                                  className="pipeline-prob"
                                  style={{
                                    color: lead.probability >= 70 ? '#27ae60' : lead.probability >= 40 ? '#f39c12' : '#e74c3c',
                                    borderColor: lead.probability >= 70 ? '#27ae60' : lead.probability >= 40 ? '#f39c12' : '#e74c3c',
                                  }}
                                >
                                  {lead.probability}%
                                </div>
                              )}
                            </div>

                            {lead.propertyTitle && (
                              <div className="pipeline-property">
                                <Home size={12} /> {lead.propertyTitle}
                              </div>
                            )}
                            {lead.estimatedValue ? (
                              <div className="pipeline-value">{formatPrice(lead.estimatedValue)}</div>
                            ) : null}

                            <div className="pipeline-card-actions">
                              {stage.key === 'interested' && (
                                <button
                                  className="pipeline-btn pipeline-btn--advance"
                                  disabled={updatingLead === lead.id}
                                  onClick={() => advanceStage(lead)}
                                >
                                  <ArrowRight size={13} />
                                  {updatingLead === lead.id ? 'Moviendo...' : 'A Negociación'}
                                </button>
                              )}
                              {stage.key === 'negotiation' && (
                                <button
                                  className="pipeline-btn pipeline-btn--sale"
                                  onClick={() => registerSaleFromLead(lead)}
                                >
                                  <DollarSign size={13} />
                                  Registrar Venta
                                </button>
                              )}
                              {stage.key === 'closed' && (
                                <span className="pipeline-closed-tag">
                                  <CheckCircle size={13} /> Cerrado
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {stageLeads.length > 4 && (
                          <Link to="/agent/crm" className="pipeline-more">
                            +{stageLeads.length - 4} más →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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

            <Link to="/agent/crm" className="quick-action-card">
              <div className="quick-action-icon quick-action-icon--blue">
                <Users size={24} />
              </div>
              <div className="quick-action-content">
                <strong>Gestionar CRM</strong>
                <span>Ver y actualizar leads</span>
              </div>
            </Link>

            <Link to="/agent/calendar" className="quick-action-card">
              <div className="quick-action-icon" style={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', color: 'white' }}>
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
