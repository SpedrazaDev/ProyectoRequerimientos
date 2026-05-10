// src/pages/SalesFunnel.jsx
// Embudo de ventas visual con etapas
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Users, Eye, MessageSquare, Calendar,
  DollarSign, CheckCircle, TrendingUp, Plus, X, Edit2
} from 'lucide-react';
import './SalesFunnel.css';

const STAGES = [
  { id: 'lead', name: 'Leads', icon: Users, color: '#3498db' },
  { id: 'contacted', name: 'Contactados', icon: MessageSquare, color: '#9b59b6' },
  { id: 'visited', name: 'Visitados', icon: Calendar, color: '#f39c12' },
  { id: 'negotiating', name: 'Negociando', icon: DollarSign, color: '#e67e22' },
  { id: 'closed', name: 'Cerrados', icon: CheckCircle, color: '#27ae60' },
];

function SalesFunnel() {
  const [opportunities, setOpportunities] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    propertyId: '',
    stage: 'lead',
    estimatedValue: '',
    probability: '50',
    notes: '',
  });

  useEffect(() => {
    // Suscripción a oportunidades
    const unsubOpp = onSnapshot(
      collection(db, 'opportunities'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setOpportunities(data);
        setLoading(false);
      }
    );

    // Cargar propiedades
    const loadProperties = async () => {
      const snap = await getDocs(collection(db, 'properties'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProperties(data);
    };
    loadProperties();

    return () => unsubOpp();
  }, []);

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      propertyId: '',
      stage: 'lead',
      estimatedValue: '',
      probability: '50',
      notes: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    const property = properties.find(p => p.id === formData.propertyId);

    const oppData = {
      ...formData,
      propertyTitle: property?.title || '',
      agentEmail: user?.email || '',
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'opportunities', editingId), oppData);
      } else {
        await addDoc(collection(db, 'opportunities'), {
          ...oppData,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      setShowAddModal(false);
    } catch (err) {
      console.error('Error guardando oportunidad:', err);
      alert('Error al guardar');
    }
  };

  const handleEdit = (opp) => {
    setFormData({
      clientName: opp.clientName || '',
      clientEmail: opp.clientEmail || '',
      clientPhone: opp.clientPhone || '',
      propertyId: opp.propertyId || '',
      stage: opp.stage || 'lead',
      estimatedValue: opp.estimatedValue || '',
      probability: opp.probability !== undefined ? String(opp.probability) : '50',
      notes: opp.notes || '',
    });
    setEditingId(opp.id);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta oportunidad?')) return;
    try {
      await deleteDoc(doc(db, 'opportunities', id));
    } catch (err) {
      console.error('Error eliminando:', err);
    }
  };

  const moveStage = async (oppId, newStage) => {
    try {
      await updateDoc(doc(db, 'opportunities', oppId), {
        stage: newStage,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error moviendo etapa:', err);
    }
  };

  // Agrupar por etapa
  const opportunitiesByStage = STAGES.map(stage => ({
    ...stage,
    opportunities: opportunities.filter(o => o.stage === stage.id),
    value: opportunities
      .filter(o => o.stage === stage.id)
      .reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0),
  }));

  // Métricas
  const totalOpportunities = opportunities.length;
  const totalValue = opportunities.reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0);
  const closedValue = opportunities
    .filter(o => o.stage === 'closed')
    .reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0);
  const conversionRate = totalOpportunities > 0
    ? ((opportunities.filter(o => o.stage === 'closed').length / totalOpportunities) * 100).toFixed(1)
    : 0;

  const weightedPipelineValue = opportunities
    .filter(o => o.stage !== 'closed')
    .reduce((sum, o) => {
      const prob = Number(o.probability) || 50;
      return sum + (Number(o.estimatedValue) || 0) * (prob / 100);
    }, 0);

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);

  if (loading) {
    return (
      <div className="funnel-page">
        <div className="loading-container">
          <div className="spinner" />
          <p>Cargando embudo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="funnel-page">
      <div className="funnel-container">

        {/* Header */}
        <div className="funnel-header">
          <div>
            <h1 className="dash-title">Embudo de Ventas</h1>
            <p className="dash-sub">
              {totalOpportunities} oportunidad{totalOpportunities !== 1 ? 'es' : ''} en proceso
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Nueva oportunidad
          </button>
        </div>

        {/* Métricas */}
        <div className="funnel-metrics">
          <div className="metric-card">
            <TrendingUp size={24} />
            <div>
              <span className="metric-label">Total oportunidades</span>
              <span className="metric-value">{totalOpportunities}</span>
            </div>
          </div>

          <div className="metric-card">
            <DollarSign size={24} />
            <div>
              <span className="metric-label">Valor total pipeline</span>
              <span className="metric-value">{formatPrice(totalValue)}</span>
            </div>
          </div>

          <div className="metric-card">
            <CheckCircle size={24} />
            <div>
              <span className="metric-label">Valor cerrado</span>
              <span className="metric-value">{formatPrice(closedValue)}</span>
            </div>
          </div>

          <div className="metric-card">
            <TrendingUp size={24} />
            <div>
              <span className="metric-label">Tasa de conversión</span>
              <span className="metric-value">{conversionRate}%</span>
            </div>
          </div>

          <div className="metric-card">
            <TrendingUp size={24} />
            <div>
              <span className="metric-label">Pipeline ponderado</span>
              <span className="metric-value">{formatPrice(weightedPipelineValue)}</span>
            </div>
          </div>
        </div>

        {/* Embudo */}
        <div className="funnel-board">
          {opportunitiesByStage.map(stage => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="funnel-column">
                
                {/* Header de columna */}
                <div className="column-header" style={{ borderTopColor: stage.color }}>
                  <div className="column-title">
                    <Icon size={18} style={{ color: stage.color }} />
                    <span>{stage.name}</span>
                    <span className="column-count">{stage.opportunities.length}</span>
                  </div>
                  <div className="column-value">{formatPrice(stage.value)}</div>
                </div>

                {/* Oportunidades */}
                <div className="column-content">
                  {stage.opportunities.length === 0 ? (
                    <div className="empty-column">
                      <Eye size={32} strokeWidth={1} style={{ color: '#ddd' }} />
                      <p>Sin oportunidades</p>
                    </div>
                  ) : (
                    stage.opportunities.map(opp => (
                      <div key={opp.id} className="opportunity-card">
                        <div className="opp-header">
                          <h4>{opp.clientName}</h4>
                          <div className="opp-actions">
                            <button
                              className="opp-action-btn"
                              onClick={() => handleEdit(opp)}
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="opp-action-btn delete"
                              onClick={() => handleDelete(opp.id)}
                              title="Eliminar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        <p className="opp-property">{opp.propertyTitle}</p>
                        <p className="opp-value">{formatPrice(opp.estimatedValue)}</p>
                        <p className="opp-probability">
                          Probabilidad: <strong>{opp.probability !== undefined ? opp.probability : 50}%</strong>
                        </p>

                        {opp.notes && (
                          <p className="opp-notes">{opp.notes}</p>
                        )}

                        {/* Botones de movimiento */}
                        <div className="stage-buttons">
                          {STAGES.map((s, idx) => {
                            if (s.id === stage.id) return null;
                            const currentIdx = STAGES.findIndex(st => st.id === stage.id);
                            const targetIdx = idx;
                            const isNext = targetIdx === currentIdx + 1;
                            const isPrev = targetIdx === currentIdx - 1;
                            
                            if (!isNext && !isPrev) return null;

                            return (
                              <button
                                key={s.id}
                                className="stage-btn"
                                onClick={() => moveStage(opp.id, s.id)}
                              >
                                {isNext ? '→' : '←'} {s.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal de agregar/editar */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div className="modal modal-opp" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Editar' : 'Nueva'} oportunidad</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del cliente *</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Propiedad de interés *</label>
                  <select
                    value={formData.propertyId}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Etapa</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Valor estimado *</label>
                  <input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Probabilidad de venta: {formData.probability}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.probability}
                    onChange={(e) => setFormData(prev => ({ ...prev, probability: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="modal__actions">
                <button type="button" className="btn btn-outline" onClick={() => { setShowAddModal(false); resetForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar' : 'Crear'} oportunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default SalesFunnel;
