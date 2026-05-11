// src/pages/FinancialControl.jsx
// RF: Control financiero centralizado, filtros, métricas clave, registro manual
import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, addDoc, getDocs,
  serverTimestamp, query, orderBy, where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  DollarSign, TrendingUp, Award, Clock, Plus, X,
  Filter, FileText, CheckCircle, AlertCircle, BarChart2, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './FinancialControl.css';

const PAYMENT_METHODS = [
  { id: 'cash',      label: 'Contado' },
  { id: 'mortgage',  label: 'Hipoteca' },
  { id: 'financing', label: 'Financiamiento' },
  { id: 'other',     label: 'Otro' },
];
const PAYMENT_STATUSES = [
  { id: 'paid',    label: 'Pagado',    color: '#27ae60' },
  { id: 'pending', label: 'Pendiente', color: '#f39c12' },
  { id: 'partial', label: 'Parcial',   color: '#3498db' },
];

function FinancialControl() {
  const [sales, setSales]           = useState([]);
  const [agents, setAgents]         = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filtros
  const [filters, setFilters] = useState({
    startDate: '', endDate: '',
    propertyType: '', agentEmail: '', paymentStatus: '',
  });

  // Formulario transacción manual
  const [manualForm, setManualForm] = useState({
    clientName: '', clientEmail: '', propertyTitle: '',
    propertyType: '', saleAmount: '', paymentMethod: 'cash',
    paymentStatus: 'paid', justification: '', notes: '',
  });

  const loadAgents = async () => {
    const snap = await getDocs(collection(db, 'employees'));
    setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadProps = async () => {
    const snap = await getDocs(collection(db, 'properties'));
    setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleRefresh = () => {
    loadAgents();
    loadProps();
    setLastUpdated(new Date());
  };

  useEffect(() => {
    const unsubSales = onSnapshot(
      query(collection(db, 'sales'), orderBy('createdAt', 'desc')),
      snap => {
        setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLastUpdated(new Date());
        setLoading(false);
      }
    );
    loadAgents();
    loadProps();
    return () => unsubSales();
  }, []);

  // ── Filtrar ventas ────────────────────────────────────────
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
      if (filters.startDate && saleDate < new Date(filters.startDate)) return false;
      if (filters.endDate)   {
        const end = new Date(filters.endDate); end.setHours(23,59,59);
        if (saleDate > end) return false;
      }
      if (filters.propertyType && s.propertyType !== filters.propertyType) return false;
      if (filters.agentEmail   && s.agentEmail   !== filters.agentEmail)   return false;
      if (filters.paymentStatus && s.paymentStatus !== filters.paymentStatus) return false;
      return true;
    });
  }, [sales, filters]);

  // ── Métricas ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total   = filteredSales.reduce((s, v) => s + (Number(v.saleAmount) || 0), 0);
    const count   = filteredSales.length;
    const avg     = count > 0 ? total / count : 0;
    const maxSale = filteredSales.reduce((m, v) => Math.max(m, Number(v.saleAmount) || 0), 0);
    const minSale = filteredSales.length > 0
      ? filteredSales.reduce((m, v) => Math.min(m, Number(v.saleAmount) || Infinity), Infinity)
      : 0;

    // Agente top
    const byAgent = {};
    filteredSales.forEach(s => {
      const k = s.agentEmail || 'sin-agente';
      byAgent[k] = (byAgent[k] || { name: s.agentName || k, count: 0, total: 0 });
      byAgent[k].count++;
      byAgent[k].total += Number(s.saleAmount) || 0;
    });
    const topAgent = Object.values(byAgent).sort((a, b) => b.total - a.total)[0] || null;

    // Tiempo promedio de cierre
    const diffs = filteredSales.map(s => {
      if (!s.createdAt) return null;
      const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
      return d;
    }).filter(Boolean);
    // Usamos días desde inicio del año como proxy si no hay fecha de inicio de proceso
    const avgCloseApprox = null; // Sin dato de inicio de proceso no calculable

    return { total, count, avg, maxSale, minSale, topAgent, avgCloseApprox };
  }, [filteredSales]);

  // ── Datos mensuales para gráfico ─────────────────────────
  const monthlyData = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { mes: key, ventas: 0, ingresos: 0 };
      map[key].ventas++;
      map[key].ingresos += Number(s.saleAmount) || 0;
    });
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12);
  }, [filteredSales]);

  // ── Tipos de propiedad únicos ─────────────────────────────
  const propertyTypes = useMemo(() =>
    [...new Set(sales.map(s => s.propertyType).filter(Boolean))], [sales]);

  // ── Registro manual ───────────────────────────────────────
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.clientName || !manualForm.saleAmount || !manualForm.justification) {
      return alert('Completa los campos obligatorios');
    }
    if (!confirm('¿Registrar esta transacción manual?')) return;

    setSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      let agentName = 'Admin'; let agentEmail = currentUser?.email || '';
      try {
        const snap = await getDocs(
          query(collection(db, 'employees'), where('email', '==', (currentUser?.email || '').toLowerCase()))
        );
        if (!snap.empty) agentName = snap.docs[0].data().name || 'Admin';
      } catch (_) {}

      await addDoc(collection(db, 'sales'), {
        clientName:    manualForm.clientName.trim(),
        clientEmail:   manualForm.clientEmail.trim().toLowerCase(),
        propertyTitle: manualForm.propertyTitle.trim(),
        propertyType:  manualForm.propertyType.trim(),
        saleAmount:    Number(manualForm.saleAmount),
        paymentMethod: manualForm.paymentMethod,
        paymentStatus: manualForm.paymentStatus,
        notes:         manualForm.notes.trim(),
        justification: manualForm.justification.trim(),
        agentName, agentEmail,
        isManual: true,
        createdAt: serverTimestamp(),
        closingDate: new Date().toISOString().split('T')[0],
      });

      setManualForm({
        clientName: '', clientEmail: '', propertyTitle: '',
        propertyType: '', saleAmount: '', paymentMethod: 'cash',
        paymentStatus: 'paid', justification: '', notes: '',
      });
      setShowManualModal(false);
      alert('✅ Transacción manual registrada');
    } catch (err) {
      console.error(err);
      alert('Error al registrar la transacción');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
  const getStatusInfo = (id) => PAYMENT_STATUSES.find(s => s.id === id) || { label: id, color: '#999' };
  const getMethodLabel = (id) => PAYMENT_METHODS.find(m => m.id === id)?.label || id || '—';

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-inline"><div className="spinner-sm" /><span>Cargando módulo financiero...</span></div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">

        {/* ── Header ── */}
        <div className="fc-header">
          <div>
            <h1 className="dash-title">Control Financiero</h1>
            <p className="dash-sub">
              {filteredSales.length} transacción{filteredSales.length !== 1 ? 'es' : ''} • Módulo de administrador
              {lastUpdated && ` • Actualizado: ${lastUpdated.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={handleRefresh} title="Actualizar datos" style={{ padding: '.45rem .75rem' }}>
              <RefreshCw size={16} />
            </button>
            <button className="btn btn-gold" onClick={() => setShowManualModal(true)}>
              <Plus size={16} /> Transacción manual
            </button>
          </div>
        </div>

        {/* ── Métricas ── */}
        <div className="fc-metrics">
          <div className="fc-metric fc-metric--green">
            <div className="fc-metric-icon"><DollarSign size={26} /></div>
            <div><span className="fc-metric-label">Ingresos totales</span><span className="fc-metric-value">{fmt(metrics.total)}</span></div>
          </div>
          <div className="fc-metric fc-metric--blue">
            <div className="fc-metric-icon"><BarChart2 size={26} /></div>
            <div><span className="fc-metric-label">Total ventas</span><span className="fc-metric-value">{metrics.count}</span></div>
          </div>
          <div className="fc-metric fc-metric--gold">
            <div className="fc-metric-icon"><TrendingUp size={26} /></div>
            <div><span className="fc-metric-label">Promedio por venta</span><span className="fc-metric-value">{fmt(metrics.avg)}</span></div>
          </div>
          <div className="fc-metric fc-metric--purple">
            <div className="fc-metric-icon"><Award size={26} /></div>
            <div><span className="fc-metric-label">Venta más alta</span><span className="fc-metric-value">{fmt(metrics.maxSale)}</span></div>
          </div>
          <div className="fc-metric fc-metric--orange">
            <div className="fc-metric-icon"><TrendingUp size={26} /></div>
            <div><span className="fc-metric-label">Venta más baja</span><span className="fc-metric-value">{fmt(metrics.minSale === Infinity ? 0 : metrics.minSale)}</span></div>
          </div>
          <div className="fc-metric fc-metric--red">
            <div className="fc-metric-icon"><Award size={26} /></div>
            <div>
              <span className="fc-metric-label">Agente top</span>
              <span className="fc-metric-value" style={{ fontSize: '1rem' }}>
                {metrics.topAgent ? `${metrics.topAgent.name} (${fmt(metrics.topAgent.total)})` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Gráfico mensual ── */}
        {monthlyData.length > 0 && (
          <div className="fc-chart-card">
            <h3 className="fc-section-title"><BarChart2 size={18} /> Ventas mensuales</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ed" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#666' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#666' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#666' }} />
                <Tooltip
                  formatter={(v, name) => name === 'ingresos' ? [fmt(v), 'Ingresos'] : [v, 'Ventas']}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="ingresos" fill="#c9a84c" name="Ingresos" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="ventas"   fill="#3498db" name="Ventas"   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Filtros ── */}
        <div className="fc-filters">
          <div className="fc-filters-title"><Filter size={16} /> Filtros</div>
          <div className="fc-filters-row">
            <div className="fc-filter-group">
              <label>Desde</label>
              <input type="date" value={filters.startDate}
                onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="fc-filter-group">
              <label>Hasta</label>
              <input type="date" value={filters.endDate}
                onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="fc-filter-group">
              <label>Tipo de propiedad</label>
              <select value={filters.propertyType}
                onChange={e => setFilters(f => ({ ...f, propertyType: e.target.value }))}>
                <option value="">Todos</option>
                {propertyTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fc-filter-group">
              <label>Agente</label>
              <select value={filters.agentEmail}
                onChange={e => setFilters(f => ({ ...f, agentEmail: e.target.value }))}>
                <option value="">Todos</option>
                {agents.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
              </select>
            </div>
            <div className="fc-filter-group">
              <label>Estado de pago</label>
              <select value={filters.paymentStatus}
                onChange={e => setFilters(f => ({ ...f, paymentStatus: e.target.value }))}>
                <option value="">Todos</option>
                {PAYMENT_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <button className="btn-clear-filters"
              onClick={() => setFilters({ startDate:'', endDate:'', propertyType:'', agentEmail:'', paymentStatus:'' })}>
              Limpiar
            </button>
          </div>
        </div>

        {/* ── Tabla de transacciones ── */}
        <div className="fc-table-card">
          <h3 className="fc-section-title"><FileText size={18} /> Transacciones</h3>
          {filteredSales.length === 0 ? (
            <div className="fc-empty">Sin transacciones para los filtros seleccionados</div>
          ) : (
            <div className="fc-table-wrap">
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Propiedad</th>
                    <th>Agente</th>
                    <th>Método</th>
                    <th>Estado pago</th>
                    <th>Monto</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(s => {
                    const st = getStatusInfo(s.paymentStatus);
                    const d  = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
                    return (
                      <tr key={s.id} className={s.isManual ? 'row-manual' : ''}>
                        <td>{d.toLocaleDateString('es-CR')}</td>
                        <td>
                          <div className="fc-client-cell">
                            <strong>{s.clientName || '—'}</strong>
                            {s.clientEmail && <small>{s.clientEmail}</small>}
                            {s.clientDocument && <small>Doc: {s.clientDocument}</small>}
                          </div>
                        </td>
                        <td>
                          <div>
                            <span>{s.propertyTitle || '—'}</span>
                            {s.propertyType && <small className="fc-tag">{s.propertyType}</small>}
                          </div>
                        </td>
                        <td>{s.agentName || s.agentEmail || '—'}</td>
                        <td>{getMethodLabel(s.paymentMethod)}</td>
                        <td>
                          <span className="fc-status-badge" style={{ background: st.color + '22', color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                        <td className="fc-amount">{fmt(s.saleAmount)}</td>
                        <td>
                          {s.isManual
                            ? <span className="fc-tag fc-tag--manual">Manual</span>
                            : <span className="fc-tag fc-tag--auto">Sistema</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="6" className="fc-total-label">Total ({filteredSales.length} ventas)</td>
                    <td className="fc-amount fc-total-value">{fmt(metrics.total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Modal transacción manual ── */}
      {showManualModal && (
        <div className="fc-modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="fc-modal" onClick={e => e.stopPropagation()}>
            <div className="fc-modal-header">
              <h3>Transacción manual</h3>
              <button onClick={() => setShowManualModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleManualSubmit} className="fc-modal-form">
              <div className="fc-modal-grid">
                <div className="fc-mf-group">
                  <label>Nombre cliente *</label>
                  <input type="text" value={manualForm.clientName} required
                    onChange={e => setManualForm(f => ({ ...f, clientName: e.target.value }))} />
                </div>
                <div className="fc-mf-group">
                  <label>Email cliente</label>
                  <input type="email" value={manualForm.clientEmail}
                    onChange={e => setManualForm(f => ({ ...f, clientEmail: e.target.value }))} />
                </div>
                <div className="fc-mf-group">
                  <label>Propiedad</label>
                  <input type="text" value={manualForm.propertyTitle} placeholder="Título o dirección"
                    onChange={e => setManualForm(f => ({ ...f, propertyTitle: e.target.value }))} />
                </div>
                <div className="fc-mf-group">
                  <label>Tipo de propiedad</label>
                  <input type="text" value={manualForm.propertyType} placeholder="Casa, apartamento..."
                    onChange={e => setManualForm(f => ({ ...f, propertyType: e.target.value }))} />
                </div>
                <div className="fc-mf-group">
                  <label>Monto (USD) *</label>
                  <input type="number" min="0" value={manualForm.saleAmount} required
                    onChange={e => setManualForm(f => ({ ...f, saleAmount: e.target.value }))} />
                </div>
                <div className="fc-mf-group">
                  <label>Método de pago</label>
                  <select value={manualForm.paymentMethod}
                    onChange={e => setManualForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div className="fc-mf-group">
                  <label>Estado de pago</label>
                  <select value={manualForm.paymentStatus}
                    onChange={e => setManualForm(f => ({ ...f, paymentStatus: e.target.value }))}>
                    {PAYMENT_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="fc-mf-group fc-mf-full">
                  <label>Justificación * <span style={{color:'#e74c3c'}}>obligatoria</span></label>
                  <textarea rows={2} value={manualForm.justification} required
                    placeholder="Motivo del registro manual (ajuste, venta externa, corrección...)"
                    onChange={e => setManualForm(f => ({ ...f, justification: e.target.value }))} />
                </div>
                <div className="fc-mf-group fc-mf-full">
                  <label>Notas adicionales</label>
                  <textarea rows={2} value={manualForm.notes}
                    onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div className="fc-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowManualModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-gold" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Registrar transacción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialControl;
