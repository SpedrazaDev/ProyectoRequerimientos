// src/pages/CRM.jsx
// HU-016 a HU-024: Sistema completo de CRM
import React, { useState, useEffect } from 'react';
import { 
  collection, onSnapshot, addDoc, updateDoc, doc, 
  serverTimestamp, query, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, Plus, Edit2, Eye, TrendingUp, Clock, 
  Phone, Mail, MapPin, Building2, X 
} from 'lucide-react';
import './CRM.css';

const LEAD_STAGES = [
  { id: 'interested', label: 'Interesado', color: '#3498db' },
  { id: 'negotiation', label: 'Negociación', color: '#f39c12' },
  { id: 'closed', label: 'Cerrado', color: '#2ecc71' },
  { id: 'lost', label: 'Perdido', color: '#95a5a6' }
];

const INTERACTION_TYPES = [
  { id: 'call', label: 'Llamada', icon: Phone },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'visit', label: 'Visita', icon: MapPin },
  { id: 'meeting', label: 'Reunión', icon: Users }
];

function CRM() {
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [filterStage, setFilterStage] = useState('all');
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    propertyId: '',
    stage: 'interested',
    notes: '',
    budget: ''
  });

  const [interactionData, setInteractionData] = useState({
    type: 'call',
    notes: '',
    outcome: ''
  });

  // Cargar leads
  useEffect(() => {
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      }));
      setLeads(leadsData);
    });

    return () => unsubscribe();
  }, []);

  // Cargar propiedades
  useEffect(() => {
    const propsRef = collection(db, 'properties');
    
    const unsubscribe = onSnapshot(propsRef, (snapshot) => {
      const propsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProperties(propsData);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateLead = async (e) => {
    e.preventDefault();

    if (!formData.clientName || !formData.clientEmail || !formData.propertyId) {
      alert('Completa los campos obligatorios');
      return;
    }

    try {
      const property = properties.find(p => p.id === formData.propertyId);
      
      await addDoc(collection(db, 'leads'), {
        clientName: formData.clientName.trim(),
        clientEmail: formData.clientEmail.trim().toLowerCase(),
        clientPhone: formData.clientPhone.trim(),
        propertyId: formData.propertyId,
        propertyTitle: property?.title || 'Propiedad sin título',
        stage: formData.stage,
        budget: formData.budget ? Number(formData.budget) : null,
        notes: formData.notes.trim(),
        interactions: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        propertyId: '',
        stage: 'interested',
        notes: '',
        budget: ''
      });

      setShowModal(false);
      alert('✅ Lead creado correctamente');
    } catch (err) {
      console.error('Error creando lead:', err);
      alert('Error al crear lead');
    }
  };

  const handleUpdateStage = async (leadId, newStage) => {
    if (!window.confirm('¿Cambiar el estado del lead?')) return;

    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        stage: newStage,
        updatedAt: serverTimestamp()
      });
      alert('✅ Estado actualizado');
    } catch (err) {
      console.error('Error actualizando estado:', err);
      alert('Error al actualizar');
    }
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();

    if (!interactionData.notes.trim()) {
      alert('Escribe una descripción de la interacción');
      return;
    }

    try {
      const lead = leads.find(l => l.id === selectedLead);
      const interactions = lead.interactions || [];

      const newInteraction = {
        type: interactionData.type,
        notes: interactionData.notes.trim(),
        outcome: interactionData.outcome.trim(),
        date: new Date().toISOString(),
        timestamp: Date.now()
      };

      const leadRef = doc(db, 'leads', selectedLead);
      await updateDoc(leadRef, {
        interactions: [...interactions, newInteraction],
        updatedAt: serverTimestamp()
      });

      setInteractionData({
        type: 'call',
        notes: '',
        outcome: ''
      });

      setShowInteractionModal(false);
      alert('✅ Interacción registrada');
    } catch (err) {
      console.error('Error registrando interacción:', err);
      alert('Error al registrar');
    }
  };

  const filteredLeads = filterStage === 'all' 
    ? leads 
    : leads.filter(lead => lead.stage === filterStage);

  const getStageInfo = (stageId) => {
    return LEAD_STAGES.find(s => s.id === stageId) || LEAD_STAGES[0];
  };

  const getInteractionIcon = (type) => {
    const interactionType = INTERACTION_TYPES.find(t => t.id === type);
    return interactionType?.icon || Phone;
  };

  return (
    <div className="crm-container">
      <div className="crm-header">
        <div>
          <h1>CRM - Gestión de Leads</h1>
          <p>Seguimiento de clientes potenciales</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={18} />
          Nuevo Lead
        </button>
      </div>

      {/* Filtros */}
      <div className="stage-filters">
        <button 
          className={filterStage === 'all' ? 'active' : ''}
          onClick={() => setFilterStage('all')}
        >
          Todos ({leads.length})
        </button>
        {LEAD_STAGES.map(stage => (
          <button
            key={stage.id}
            className={filterStage === stage.id ? 'active' : ''}
            onClick={() => setFilterStage(stage.id)}
            style={{ borderColor: stage.color }}
          >
            {stage.label} ({leads.filter(l => l.stage === stage.id).length})
          </button>
        ))}
      </div>

      {/* Lista de Leads */}
      <div className="leads-grid">
        {filteredLeads.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>No hay leads {filterStage !== 'all' ? 'en esta etapa' : ''}</p>
          </div>
        ) : (
          filteredLeads.map(lead => {
            const stage = getStageInfo(lead.stage);
            const property = properties.find(p => p.id === lead.propertyId);

            return (
              <div key={lead.id} className="lead-card">
                <div className="lead-header">
                  <div className="lead-title">
                    <Users size={20} />
                    <h3>{lead.clientName}</h3>
                  </div>
                  <div 
                    className="lead-stage-badge"
                    style={{ background: stage.color }}
                  >
                    {stage.label}
                  </div>
                </div>

                <div className="lead-info">
                  <div className="info-item">
                    <Mail size={14} />
                    <span>{lead.clientEmail}</span>
                  </div>
                  {lead.clientPhone && (
                    <div className="info-item">
                      <Phone size={14} />
                      <span>{lead.clientPhone}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <Building2 size={14} />
                    <span>{property?.title || 'Propiedad eliminada'}</span>
                  </div>
                  {lead.budget && (
                    <div className="info-item">
                      <TrendingUp size={14} />
                      <span>Presupuesto: ${lead.budget.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {lead.notes && (
                  <div className="lead-notes">
                    <p>{lead.notes}</p>
                  </div>
                )}

                <div className="lead-stats">
                  <div className="stat">
                    <Clock size={14} />
                    <span>{lead.interactions?.length || 0} interacciones</span>
                  </div>
                  <div className="stat">
                    <span>Actualizado: {lead.updatedAt.toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="lead-actions">
                  <button 
                    onClick={() => {
                      setSelectedLead(lead.id);
                      setShowInteractionModal(true);
                    }}
                    className="btn-action"
                  >
                    <Plus size={16} />
                    Interacción
                  </button>

                  <div className="stage-dropdown">
                    <select 
                      value={lead.stage}
                      onChange={(e) => handleUpdateStage(lead.id, e.target.value)}
                    >
                      {LEAD_STAGES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={() => setSelectedLead(lead.id)}
                    className="btn-action"
                  >
                    <Eye size={16} />
                  </button>
                </div>

                {/* Historial de Interacciones */}
                {selectedLead === lead.id && lead.interactions && lead.interactions.length > 0 && (
                  <div className="interactions-history">
                    <h4>Historial de Interacciones</h4>
                    {lead.interactions
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((interaction, idx) => {
                        const Icon = getInteractionIcon(interaction.type);
                        return (
                          <div key={idx} className="interaction-item">
                            <div className="interaction-icon">
                              <Icon size={14} />
                            </div>
                            <div className="interaction-details">
                              <div className="interaction-type">
                                {INTERACTION_TYPES.find(t => t.id === interaction.type)?.label}
                              </div>
                              <div className="interaction-notes">{interaction.notes}</div>
                              {interaction.outcome && (
                                <div className="interaction-outcome">Resultado: {interaction.outcome}</div>
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
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nuevo Lead */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Lead</h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLead}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre del Cliente *</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Propiedad de Interés *</label>
                  <select
                    value={formData.propertyId}
                    onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title} - ${prop.price?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Presupuesto</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Estado Inicial</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({...formData, stage: e.target.value})}
                  >
                    {LEAD_STAGES.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Notas</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    placeholder="Información adicional sobre el cliente..."
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Interacción */}
      {showInteractionModal && (
        <div className="modal-overlay" onClick={() => setShowInteractionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Interacción</h2>
              <button onClick={() => setShowInteractionModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddInteraction}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo de Interacción *</label>
                  <select
                    value={interactionData.type}
                    onChange={(e) => setInteractionData({...interactionData, type: e.target.value})}
                  >
                    {INTERACTION_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Descripción *</label>
                  <textarea
                    value={interactionData.notes}
                    onChange={(e) => setInteractionData({...interactionData, notes: e.target.value})}
                    rows={3}
                    placeholder="¿Qué se habló o acordó?"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Resultado</label>
                  <input
                    type="text"
                    value={interactionData.outcome}
                    onChange={(e) => setInteractionData({...interactionData, outcome: e.target.value})}
                    placeholder="Ej: Cliente interesado, agendar visita"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowInteractionModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Registrar Interacción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CRM;
