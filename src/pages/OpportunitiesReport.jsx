// src/pages/OpportunitiesReport.jsx
// RF: Informe de posibles ventas — bookings sin venta + leads por probabilidad
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  AlertCircle, Calendar, Clock, TrendingUp,
  Users, CheckCircle, Filter
} from 'lucide-react';
import './OpportunitiesReport.css';

function OpportunitiesReport() {
  const [bookings,   setBookings]   = useState([]);
  const [sales,      setSales]      = useState([]);
  const [leads,      setLeads]      = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterProb, setFilterProb] = useState('all'); // all, high, medium, low

  useEffect(() => {
    const load = async () => {
      try {
        const [bookSnap, salesSnap, leadsSnap, propsSnap] = await Promise.all([
          getDocs(query(collection(db, 'bookings'), where('status', '==', 'confirmada'))),
          getDocs(collection(db, 'sales')),
          getDocs(query(collection(db, 'leads'), orderBy('updatedAt', 'desc'))),
          getDocs(collection(db, 'properties')),
        ]);
        setBookings(bookSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSales(salesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLeads(leadsSnap.docs.map(d => ({
          id: d.id, ...d.data(),
          updatedAt: d.data().updatedAt?.toDate?.() || new Date(),
        })));
        setProperties(propsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Bookings confirmadas que NO tienen venta registrada para esa propiedad
  const unconvertedBookings = useMemo(() => {
    const soldPropertyIds = new Set(sales.map(s => s.propertyId).filter(Boolean));
    return bookings
      .filter(b => !soldPropertyIds.has(b.propertyId))
      .map(b => {
        const prop = properties.find(p => p.id === b.propertyId);
        const confirmDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        const daysSince = Math.floor((Date.now() - confirmDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...b, propTitle: prop?.title || b.propertyTitle || 'Propiedad', confirmDate, daysSince };
      })
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [bookings, sales, properties]);

  // Leads activos (no cerrado ni perdido) del CRM ordenados por probabilidad
  const activeLeads = useMemo(() => {
    const active = leads.filter(l => l.stage === 'interested' || l.stage === 'negotiation');
    const filtered = filterProb === 'all' ? active
      : filterProb === 'high'   ? active.filter(l => (l.probability || 50) >= 70)
      : filterProb === 'medium' ? active.filter(l => (l.probability || 50) >= 40 && (l.probability || 50) < 70)
      : active.filter(l => (l.probability || 50) < 40);
    return filtered.sort((a, b) => (b.probability || 50) - (a.probability || 50));
  }, [leads, filterProb]);

  const probColor = (p) => {
    const n = Number(p) || 50;
    if (n >= 70) return '#27ae60';
    if (n >= 40) return '#f39c12';
    return '#e74c3c';
  };

  const stageLabel = (s) => s === 'interested' ? 'Interesado' : 'Negociación';

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-inline"><div className="spinner-sm" /><span>Cargando informe...</span></div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">

        <div className="opp-header">
          <div>
            <h1 className="dash-title">Informe de Oportunidades</h1>
            <p className="dash-sub">
              {unconvertedBookings.length} cita{unconvertedBookings.length !== 1 ? 's' : ''} sin convertir
              · {activeLeads.length} lead{activeLeads.length !== 1 ? 's' : ''} activos en CRM
            </p>
          </div>
        </div>

        {/* ── Sección 1: Citas sin venta ── */}
        <div className="opp-section">
          <div className="opp-section-header">
            <h2 className="opp-section-title">
              <Calendar size={20} />
              Citas confirmadas sin venta registrada
            </h2>
            <span className="opp-badge opp-badge--warning">{unconvertedBookings.length} pendiente{unconvertedBookings.length !== 1 ? 's' : ''}</span>
          </div>

          {unconvertedBookings.length === 0 ? (
            <div className="opp-empty">
              <CheckCircle size={40} />
              <p>Todas las citas confirmadas tienen venta registrada</p>
            </div>
          ) : (
            <div className="opp-table-wrap">
              <table className="opp-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Propiedad</th>
                    <th>Fecha cita</th>
                    <th>Días esperando</th>
                    <th>Agente</th>
                    <th>Seguimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {unconvertedBookings.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div className="opp-client">
                          <strong>{b.name || b.clientName || '—'}</strong>
                          <small>{b.email || '—'}</small>
                        </div>
                      </td>
                      <td>{b.propTitle}</td>
                      <td>{b.date ? `${b.date}${b.time ? ' · ' + b.time : ''}` : b.confirmDate.toLocaleDateString()}</td>
                      <td>
                        <span className={`opp-days ${b.daysSince > 15 ? 'opp-days--urgent' : b.daysSince > 7 ? 'opp-days--warn' : ''}`}>
                          <Clock size={13} /> {b.daysSince} días
                        </span>
                      </td>
                      <td>{b.assignedTo || '—'}</td>
                      <td>
                        <span className={`opp-follow-badge ${b.daysSince > 15 ? 'urgent' : 'normal'}`}>
                          {b.daysSince > 15 ? '⚠ Seguimiento urgente' : 'Seguimiento pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Sección 2: Leads CRM activos ── */}
        <div className="opp-section">
          <div className="opp-section-header">
            <h2 className="opp-section-title">
              <TrendingUp size={20} />
              Leads activos en CRM
            </h2>
            <div className="opp-prob-filters">
              <Filter size={14} />
              {['all','high','medium','low'].map(v => (
                <button key={v}
                  className={`opp-filter-btn ${filterProb === v ? 'active' : ''}`}
                  onClick={() => setFilterProb(v)}>
                  {v === 'all' ? 'Todos' : v === 'high' ? '≥70%' : v === 'medium' ? '40–69%' : '<40%'}
                </button>
              ))}
            </div>
          </div>

          {activeLeads.length === 0 ? (
            <div className="opp-empty">
              <Users size={40} />
              <p>No hay leads activos{filterProb !== 'all' ? ' en este rango de probabilidad' : ''}</p>
            </div>
          ) : (
            <div className="opp-leads-grid">
              {activeLeads.map(lead => (
                <div key={lead.id} className="opp-lead-card">
                  <div className="opp-lead-top">
                    <div>
                      <h4>{lead.clientName}</h4>
                      <small>{lead.clientEmail || '—'}</small>
                    </div>
                    <div className="opp-prob-ring" style={{ '--prob-color': probColor(lead.probability) }}>
                      <span>{lead.probability !== undefined ? lead.probability : 50}%</span>
                    </div>
                  </div>

                  <div className="opp-lead-info">
                    <span className="opp-stage-badge" style={{
                      background: lead.stage === 'negotiation' ? '#fff3cd' : '#e3f2fd',
                      color:      lead.stage === 'negotiation' ? '#856404' : '#1565c0',
                    }}>
                      {stageLabel(lead.stage)}
                    </span>
                    <span className="opp-prop">{lead.propertyTitle || '—'}</span>
                    {lead.estimatedValue && (
                      <span className="opp-value">{fmt(lead.estimatedValue)}</span>
                    )}
                  </div>

                  <div className="opp-lead-footer">
                    <span className={`opp-follow-badge ${
                      !lead.interactions?.length ? 'urgent' :
                      (Date.now() - lead.updatedAt.getTime()) > 15 * 86400000 ? 'warn' : 'normal'
                    }`}>
                      {!lead.interactions?.length
                        ? '⚠ Sin interacciones'
                        : (Date.now() - lead.updatedAt.getTime()) > 15 * 86400000
                        ? '⚠ Sin actividad reciente'
                        : `${lead.interactions.length} interacción${lead.interactions.length !== 1 ? 'es' : ''}`}
                    </span>
                    <span className="opp-updated">
                      Actualizado: {lead.updatedAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default OpportunitiesReport;
