// src/pages/CRM.jsx
// HU-016 a HU-024 + HU-041-044: CRM unificado con kanban, valor estimado y probabilidad
import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Users, Plus, Eye, TrendingUp, Clock,
  Phone, Mail, MapPin, Building2, X, DollarSign, CheckCircle
} from 'lucide-react';
import './CRM.css';

const LEAD_STAGES = [
  { id: 'interested', label: 'Interesado',  color: '#3498db' },
  { id: 'negotiation', label: 'Negociación', color: '#f39c12' },
  { id: 'closed',      label: 'Cerrado',     color: '#2ecc71' },
  { id: 'lost',        label: 'Perdido',     color: '#95a5a6' },
];

const INTERACTION_TYPES = [
  { id: 'call',    label: 'Llamada',  icon: Phone },
  { id: 'email',   label: 'Email',    icon: Mail  },
  { id: 'visit',   label: 'Visita',   icon: MapPin },
  { id: 'meeting', label: 'Reunión',  icon: Users },
];

const EMPTY_FORM = {
  clientName: '', clientEmail: '', clientPhone: '',
  propertyId: '', stage: 'interested', notes: '',
  budget: '', estimatedValue: '', probability: '50',
};

function CRM() {
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [expandedLead, setExpandedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [interactionData, setInteractionData] = useState({ type: 'call', notes: '', outcome: '' });

  useEffect(() => {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setLeads(snap.docs.map(d => ({
        id: d.id, ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
        updatedAt: d.data().updatedAt?.toDate?.() || new Date(),
      })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'properties'), snap => {
      setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ── Métricas ────────────────────────────────────────────────
  const totalValue    = leads.reduce((s, l) => s + (Number(l.estimatedValue) || 0), 0);
  const weightedValue = leads
    .filter(l => l.stage !== 'closed')
    .reduce((s, l) => s + (Number(l.estimatedValue) || 0) * ((Number(l.probability) || 50) / 100), 0);
  const closedValue = leads
    .filter(l => l.stage === 'closed')
    .reduce((s, l) => s + (Number(l.estimatedValue) || 0), 0);
  const convRate = leads.length > 0
    ? ((leads.filter(l => l.stage === 'closed').length / leads.length) * 100).toFixed(1)
    : 0;

  // ── Acciones ────────────────────────────────────────────────
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!formData.clientName || !formData.clientEmail || !formData.propertyId) {
      alert('Completa los campos obligatorios');
      return;
    }
    try {
      const property = properties.find(p => p.id === formData.propertyId);
      await addDoc(collection(db, 'leads'), {
        clientName:     formData.clientName.trim(),
        clientEmail:    formData.clientEmail.trim().toLowerCase(),
        clientPhone:    formData.clientPhone.trim(),
        propertyId:     formData.propertyId,
        propertyTitle:  property?.title || '',
        stage:          formData.stage,
        budget:         formData.budget ? Number(formData.budget) : null,
        estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : null,
        probability:    Number(formData.probability) || 50,
        notes:          formData.notes.trim(),
        interactions:   [],
        createdAt:      serverTimestamp(),
        updatedAt:      serverTimestamp(),
      });
      setFormData(EMPTY_FORM);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert('Error al crear lead');
    }
  };

  const handleUpdateStage = async (leadId, newStage) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { stage: newStage, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!interactionData.notes.trim()) {
      alert('Escribe una descripción');
      return;
    }
    try {
      const lead = leads.find(l => l.id === selectedLead);
      const newInteraction = {
        type:      interactionData.type,
        notes:     interactionData.notes.trim(),
        outcome:   interactionData.outcome.trim(),
        date:      new Date().toISOString(),
        timestamp: Date.now(),
      };
      await updateDoc(doc(db, 'leads', selectedLead), {
        interactions: [...(lead.interactions || []), newInteraction],
        updatedAt: serverTimestamp(),
      });
      setInteractionData({ type: 'call', notes: '', outcome: '' });
      setShowInteractionModal(false);
    } catch (err) {
      console.error(err);
      alert('Error al registrar interacción');
    }
  };

  // ── Helpers ─────────────────────────────────────────────────
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const getStage = (id) => LEAD_STAGES.find(s => s.id === id) || LEAD_STAGES[0];
  const getInteractionIcon = (type) => (INTERACTION_TYPES.find(t => t.id === type)?.icon) || Phone;

  const leadsByStage = LEAD_STAGES.map(stage => ({
    ...stage,
    leads: leads.filter(l => l.stage === stage.id),
  }));

  return (
    <div className="crm-page">
      <div className="crm-container">

        {/* Header */}
        <div className="crm-header">
          <div>
            <h1>CRM — Gestión de Leads</h1>
            <p>{leads.length} lead{leads.length !== 1 ? 's' : ''} en seguimiento</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={18} /> Nuevo Lead
          </button>
        </div>

        {/* Métricas */}
        <div className="crm-metrics">
          <div className="crm-metric">
            <TrendingUp size={22} />
            <div>
              <span className="metric-label">Valor total pipeline</span>
              <span className="metric-value">{fmt(totalValue)}</span>
            </div>
          </div>
          <div className="crm-metric">
            <DollarSign size={22} />
            <div>
              <span className="metric-label">Pipeline ponderado</span>
              <span className="metric-value">{fmt(weightedValue)}</span>
            </div>
          </div>
          <div className="crm-metric">
            <CheckCircle size={22} />
            <div>
              <span className="metric-label">Valor cerrado</span>
              <span className="metric-value">{fmt(closedValue)}</span>
            </div>
          </div>
          <div className="crm-metric">
            <TrendingUp size={22} />
            <div>
              <span className="metric-label">Tasa de conversión</span>
              <span className="metric-value">{convRate}%</span>
            </div>
          </div>
        </div>

        {/* Kanban */}
        <div className="kanban-board">
          {leadsByStage.map(stage => (
            <div key={stage.id} className="kanban-column">

              <div className="kanban-column-header" style={{ borderTopColor: stage.color }}>
                <span className="kanban-column-title">{stage.label}</span>
                <span className="kanban-column-count">{stage.leads.length}</span>
              </div>

              <div className="kanban-cards">
                {stage.leads.length === 0 ? (
                  <div className="kanban-empty">Sin leads</div>
                ) : (
                  stage.leads.map(lead => {
                    const property = properties.find(p => p.id === lead.propertyId);
                    const isExpanded = expandedLead === lead.id;

                    return (
                      <div key={lead.id} className="lead-card">

                        <div className="lead-card-header">
                          <h4>{lead.clientName}</h4>
                          <button
                            className="btn-icon"
                            onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                            title={isExpanded ? 'Ocultar historial' : 'Ver historial'}
                          >
                            <Eye size={14} />
                          </button>
                        </div>

                        <div className="lead-card-info">
                          <span><Mail size={12} /> {lead.clientEmail}</span>
                          {lead.clientPhone && <span><Phone size={12} /> {lead.clientPhone}</span>}
                          <span><Building2 size={12} /> {property?.title || 'Propiedad eliminada'}</span>
                        </div>

                        {(lead.estimatedValue || lead.probability !== undefined) && (
                          <div className="lead-card-values">
                            {lead.estimatedValue && (
                              <span className="value-badge">{fmt(lead.estimatedValue)}</span>
                            )}
                            <span className="prob-badge">
                              {lead.probability !== undefined ? lead.probability : 50}% prob.
                            </span>
                          </div>
                        )}

                        {lead.notes && (
                          <p className="lead-card-notes">{lead.notes}</p>
                        )}

                        <div className="lead-card-stats">
                          <span><Clock size={12} /> {lead.interactions?.length || 0} interacciones</span>
                          <span>{lead.updatedAt.toLocaleDateString()}</span>
                        </div>

                        <div className="lead-card-actions">
                          <button
                            className="btn-action"
                            onClick={() => { setSelectedLead(lead.id); setShowInteractionModal(true); }}
                          >
                            <Plus size={14} /> Interacción
                          </button>

                          <select
                            value={lead.stage}
                            onChange={(e) => handleUpdateStage(lead.id, e.target.value)}
                            className="stage-select"
                          >
                            {LEAD_STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Historial de interacciones expandible */}
                        {isExpanded && lead.interactions && lead.interactions.length > 0 && (
                          <div className="interactions-history">
                            <h5>Historial</h5>
                            {[...lead.interactions]
                              .sort((a, b) => b.timestamp - a.timestamp)
                              .map((interaction, idx) => {
                                const Icon = getInteractionIcon(interaction.type);
                                return (
                                  <div key={idx} className="interaction-item">
                                    <div className="interaction-icon"><Icon size={13} /></div>
                                    <div className="interaction-details">
                                      <div className="interaction-type">
                                        {INTERACTION_TYPES.find(t => t.id === interaction.type)?.label}
                                      </div>
                                      <div className="interaction-notes">{interaction.notes}</div>
                                      {interaction.outcome && (
                                        <div className="interaction-outcome">→ {interaction.outcome}</div>
                                      )}
                                      <div className="interaction-date">
                                        {new Date(interaction.date).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {isExpanded && (!lead.interactions || lead.interactions.length === 0) && (
                          <div className="interactions-history">
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                              Sin interacciones registradas
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Modal Nuevo Lead */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Lead</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateLead}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input type="text" value={formData.clientName}
                    onChange={e => setFormData({ ...formData, clientName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={formData.clientEmail}
                    onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={formData.clientPhone}
                    onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Propiedad de interés *</label>
                  <select value={formData.propertyId}
                    onChange={e => setFormData({ ...formData, propertyId: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title} — ${p.price?.toLocaleString()}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Valor estimado</label>
                  <input type="number" value={formData.estimatedValue} placeholder="0"
                    onChange={e => setFormData({ ...formData, estimatedValue: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Presupuesto del cliente</label>
                  <input type="number" value={formData.budget} placeholder="0"
                    onChange={e => setFormData({ ...formData, budget: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Estado inicial</label>
                  <select value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}>
                    {LEAD_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Probabilidad de cierre: {formData.probability}%</label>
                  <input type="range" min="0" max="100" step="5" value={formData.probability}
                    onChange={e => setFormData({ ...formData, probability: e.target.value })}
                    style={{ width: '100%' }} />
                </div>
                <div className="form-group full-width">
                  <label>Notas</label>
                  <textarea value={formData.notes} rows={3}
                    placeholder="Información adicional..."
                    onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">Crear Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Interacción */}
      {showInteractionModal && (
        <div className="modal-overlay" onClick={() => setShowInteractionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Interacción</h2>
              <button onClick={() => setShowInteractionModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddInteraction}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo *</label>
                  <select value={interactionData.type}
                    onChange={e => setInteractionData({ ...interactionData, type: e.target.value })}>
                    {INTERACTION_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Descripción *</label>
                  <textarea value={interactionData.notes} rows={3}
                    placeholder="¿Qué se habló o acordó?"
                    onChange={e => setInteractionData({ ...interactionData, notes: e.target.value })}
                    required />
                </div>
                <div className="form-group full-width">
                  <label>Resultado</label>
                  <input type="text" value={interactionData.outcome}
                    placeholder="Ej: Cliente interesado, agendar visita"
                    onChange={e => setInteractionData({ ...interactionData, outcome: e.target.value })} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowInteractionModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CRM;
